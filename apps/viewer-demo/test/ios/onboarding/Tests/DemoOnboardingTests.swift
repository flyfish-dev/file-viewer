import XCTest

final class DemoOnboardingTests: XCTestCase {
    func testWelcomeAndMobileEntriesInSafari() throws {
        continueAfterFailure = false
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        safari.activate()
        let close = safari.buttons["Close welcome card"].firstMatch
        XCTAssertTrue(close.waitForExistence(timeout: 60), safari.debugDescription)
        XCTAssertTrue(close.isHittable)
        XCTAssertTrue(safari.buttons["Explore a drawing: sample.dwg"].firstMatch.isHittable)
        XCTAssertTrue(safari.buttons["Read a presentation: sample-presentation.pptx"].firstMatch.exists)
        XCTAssertTrue(safari.buttons["Explore a workbook: financial-sample.xlsx"].firstMatch.exists)
        XCTAssertTrue(safari.buttons["Explore a low-poly fox: fox.glb"].firstMatch.exists)
        capture(safari, "welcome")
        let fox = safari.buttons["Explore a low-poly fox: fox.glb"].firstMatch
        for _ in 0..<3 {
            if fox.isHittable { break }
            safari.swipeUp()
        }
        XCTAssertTrue(fox.isHittable)
        fox.tap()
        XCTAssertTrue(safari.staticTexts["1 meshes"].firstMatch.waitForExistence(timeout: 60))
        capture(safari, "fox-before-orbit")
        let orbitStart = safari.coordinate(withNormalizedOffset: CGVector(dx: 0.45, dy: 0.45))
        let orbitEnd = safari.coordinate(withNormalizedOffset: CGVector(dx: 0.75, dy: 0.5))
        orbitStart.press(forDuration: 0.1, thenDragTo: orbitEnd)
        capture(safari, "fox-after-orbit")

        let upload = safari.buttons["Upload a local file"].firstMatch
        let samples = safari.buttons["Open sample files"].firstMatch
        XCTAssertTrue(upload.waitForExistence(timeout: 15))
        XCTAssertTrue(upload.isHittable)
        XCTAssertTrue(samples.isHittable)
        XCTAssertGreaterThanOrEqual(upload.frame.height, 44)
        XCTAssertFalse(upload.frame.intersects(samples.frame))
        capture(safari, "mobile-primary-entries")
        samples.tap()
        XCTAssertTrue(safari.staticTexts["Sample library"].firstMatch.waitForExistence(timeout: 15))
        // The library opens the current model group after selecting the fox.
        let foxInLibrary = safari.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'Low-poly fox'")).firstMatch
        XCTAssertTrue(foxInLibrary.waitForExistence(timeout: 15))
        XCTAssertTrue(foxInLibrary.isHittable)
        capture(safari, "sample-library")
        let closePanel = safari.buttons.matching(identifier: "Close control panel").allElementsBoundByIndex.first { $0.isHittable }
        XCTAssertNotNil(closePanel)
        closePanel?.tap()
        XCTAssertTrue(upload.isHittable)
        upload.tap()
        XCTAssertTrue(safari.staticTexts["Choose a file"].firstMatch.waitForExistence(timeout: 15))
        capture(safari, "local-file-panel")
    }

    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
