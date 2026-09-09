import XCTest

final class PDFNavigationTests: XCTestCase {
    override func tearDown() {
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        print("FINAL_ACCESSIBILITY\n\(safari.debugDescription)")
        capture(safari, "final-state")
        super.tearDown()
    }
    func testSafariPDFNavigation() throws {
        continueAfterFailure = false
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        safari.activate()
        XCTAssertTrue(safari.webViews.firstMatch.waitForExistence(timeout: 30))
        let next = safari.buttons.matching(NSPredicate(format: "label == '下一页' OR label == 'Next page'")).firstMatch
        let previous = safari.buttons.matching(NSPredicate(format: "label == '上一页' OR label == 'Previous page'")).firstMatch
        let contents = safari.staticTexts["目录"].firstMatch
        let cover = safari.staticTexts["技术说明"].firstMatch
        let chapter = safari.staticTexts["技术定位"].firstMatch
        XCTAssertTrue(next.waitForExistence(timeout: 30))
        XCTAssertTrue(cover.waitForExistence(timeout: 30))
        // Safari may restore this document's reading position from the preceding run.
        // Establish page 1 through the real controls before asserting the 1 -> 2 transition.
        capture(safari, "initial-restored-position")
        for _ in 0..<13 {
            if !previous.isEnabled { break }
            previous.tap()
        }
        XCTAssertFalse(previous.isEnabled, "The regression must start on the first page")
        waitForVisibleHeading(cover)
        assertPage("1", safari: safari, previous: previous, next: next)
        let initialContentsY = contents.frame.minY
        capture(safari, "page-1")
        next.tap()
        waitForVisibleHeading(contents, before: initialContentsY)
        assertPage("2", safari: safari, previous: previous, next: next)
        capture(safari, "page-2-after-tap")
        let chapterY = chapter.frame.minY
        next.tap()
        waitForVisibleHeading(chapter, before: chapterY)
        assertPage("3", safari: safari, previous: previous, next: next)
        capture(safari, "page-3-after-tap")
        previous.tap()
        waitForVisibleHeading(contents)
        assertPage("2", safari: safari, previous: previous, next: next)
        previous.tap()
        waitForVisibleHeading(cover)
        assertPage("1", safari: safari, previous: previous, next: next)
        XCTAssertFalse(previous.isEnabled)
        capture(safari, "page-1-after-return")
        verifyCompactToolbar(safari, next: next)
    }

    private func verifyCompactToolbar(_ safari: XCUIApplication, next: XCUIElement) {
        let navigationY = next.frame.minY
        let more = safari.buttons.matching(NSPredicate(format: "label == '更多操作' OR label == 'More actions'")).firstMatch
        XCTAssertTrue(more.waitForExistence(timeout: 10))
        XCTAssertTrue(more.isHittable)
        XCTAssertGreaterThanOrEqual(more.frame.height, 40)
        more.tap()
        let download = safari.buttons.matching(NSPredicate(format: "label == '下载' OR label == 'Download'")).firstMatch
        let html = safari.buttons["HTML"].firstMatch
        XCTAssertTrue(download.waitForExistence(timeout: 10))
        XCTAssertTrue(download.isHittable)
        XCTAssertTrue(html.isHittable)
        XCTAssertGreaterThanOrEqual(download.frame.height, 40)
        XCTAssertFalse(download.frame.intersects(html.frame), "Output controls must not overlap")
        capture(safari, "toolbar-expanded")
        more.tap()

        let search = safari.buttons.matching(NSPredicate(format: "label == '搜索' OR label == 'Search'")).firstMatch
        search.tap()
        let input = safari.searchFields.matching(NSPredicate(format: "label == '搜索文档' OR label == 'Search document'")).firstMatch
        XCTAssertTrue(input.waitForExistence(timeout: 10))
        XCTAssertTrue(input.isHittable)
        XCTAssertGreaterThanOrEqual(input.frame.height, 40)
        input.typeText("PDF\n")
        capture(safari, "toolbar-search")
        let close = safari.buttons.matching(NSPredicate(format: "label == '收起搜索' OR label == 'Close search'")).firstMatch
        XCTAssertTrue(close.isHittable)
        close.tap()
        XCTAssertTrue(next.isHittable, "Closing search must restore reachable PDF navigation")
        XCTAssertEqual(next.frame.minY, navigationY, accuracy: 2, "The keyboard must not leave the entire host page scrolled")
        next.tap()
        XCTAssertTrue(next.isHittable, "Page navigation must still work after searching")
        capture(safari, "toolbar-restored")
    }

    private func assertPage(_ number: String, safari: XCUIApplication, previous: XCUIElement, next: XCUIElement) {
        let meter = safari.staticTexts.matching(NSPredicate(format: "label == %@", number)).allElementsBoundByIndex.filter {
            $0.frame.minX > previous.frame.maxX && $0.frame.maxX < next.frame.minX &&
            abs($0.frame.midY - next.frame.midY) < 12
        }
        XCTAssertEqual(meter.count, 1)
        XCTAssertTrue(next.isHittable, "Navigation must stay reachable after the tap")
    }

    private func waitForVisibleHeading(_ element: XCUIElement, before: CGFloat? = nil) {
        let expectation = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            guard element.exists else { return false }
            let rect = element.frame
            return rect.width > 0 && rect.minY >= 95 && rect.maxY < 700 &&
                (before == nil || rect.minY < before! - 100)
        }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [expectation], timeout: 20), .completed)
        print("PDF_HEADING \(element.label) frame=\(element.frame)")
    }

    private func capture(_ safari: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: safari.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
