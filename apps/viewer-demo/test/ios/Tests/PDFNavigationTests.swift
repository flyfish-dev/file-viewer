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

