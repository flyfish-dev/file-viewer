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
        XCTAssertTrue(safari.buttons["Read a business report: quarterly-operations-report.docx"].firstMatch.exists)
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
        let meshesFound = safari.staticTexts["1 mesh"].firstMatch.waitForExistence(timeout: 60)
        capture(safari, "fox-mesh-label")
        XCTAssertTrue(meshesFound, safari.debugDescription)
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
        try verifySpreadsheetToolbar(safari)
    }

    private func verifySpreadsheetToolbar(_ safari: XCUIApplication) throws {
        let addressBar = safari.textFields["TabBarItemTitle"].firstMatch
        XCTAssertTrue(addressBar.waitForExistence(timeout: 10), safari.debugDescription)
        addressBar.tap()
        let urlField = safari.textFields["URL"].firstMatch
        let editor = urlField.waitForExistence(timeout: 5) ? urlField : addressBar
        capture(safari, "safari-address-editor")
        let address = (editor.value as? String ?? "")
            .replacingOccurrences(of: "\u{200e}", with: "")
            .replacingOccurrences(of: "\u{200f}", with: "")
        var components = try XCTUnwrap(URLComponents(string: address.contains("://") ? address : "http://\(address)"))
        XCTAssertEqual(components.host, "127.0.0.1", "Keep the test on the local frozen Demo")
        let port = try XCTUnwrap(components.port, "The local test server must retain its explicit port")
        components.path = "/"
        components.queryItems = [
            URLQueryItem(name: "lang", value: "en-US"),
            URLQueryItem(name: "url", value: "http://127.0.0.1:\(port)/example/en/financial-sample.xlsx")
        ]
        let target = try XCTUnwrap(components.url?.absoluteString)
        editor.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: address.count))
        editor.typeText(target + "\n")

        let zoomIn = safari.buttons["Zoom in"].firstMatch
        let zoomOut = safari.buttons["Zoom out"].firstMatch
        let search = safari.buttons["Search"].firstMatch
        let more = safari.buttons["More actions"].firstMatch
        let download = safari.buttons["Download"].firstMatch
        XCTAssertTrue(more.waitForExistence(timeout: 60), safari.debugDescription)
        XCTAssertTrue(safari.staticTexts["701 rows, 16 columns, loading smoothly by viewport"].firstMatch.waitForExistence(timeout: 30), safari.debugDescription)
        XCTAssertTrue(safari.switches["Sheet1"].firstMatch.exists)
        let meter = safari.buttons.matching(NSPredicate(format: "label MATCHES %@", "^[0-9]+(?:[.,][0-9]+)?%$")).firstMatch
        XCTAssertTrue(meter.exists, safari.debugDescription)
        let initial = try zoomValue(meter)
        try verifyToolbarGeometry(safari, controls: [search, zoomOut, meter, zoomIn, more], name: "spreadsheet-toolbar-initial")
        XCTAssertTrue(zoomIn.isEnabled)
        zoomIn.tap()
        let enlarged = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            ((try? self.zoomValue(meter)) ?? 0) > initial
        }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [enlarged], timeout: 10), .completed)
        try verifyToolbarGeometry(safari, controls: [search, zoomOut, meter, zoomIn, more], name: "spreadsheet-toolbar-zoomed")
        XCTAssertTrue(zoomOut.isEnabled)
        zoomOut.tap()
        let restored = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            (try? self.zoomValue(meter)) == initial
        }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [restored], timeout: 10), .completed)
        more.tap()
        XCTAssertTrue(download.waitForExistence(timeout: 10), safari.debugDescription)
        try verifyToolbarGeometry(safari, controls: [download], name: "spreadsheet-more-menu")
        XCTAssertTrue(download.isEnabled)
        download.tap()
        capture(safari, "spreadsheet-download-action")
    }

    private func zoomValue(_ meter: XCUIElement) throws -> Double {
        try XCTUnwrap(Double(meter.label.replacingOccurrences(of: "%", with: "").replacingOccurrences(of: ",", with: ".")))
    }

    private func verifyToolbarGeometry(_ safari: XCUIApplication, controls: [XCUIElement], name: String) throws {
        let viewport = safari.webViews.firstMatch.frame.intersection(safari.windows.firstMatch.frame)
        XCTAssertFalse(viewport.isEmpty)
        for (index, control) in controls.enumerated() {
            XCTAssertTrue(control.exists, safari.debugDescription)
            XCTAssertTrue(control.isHittable, "Unreachable toolbar control: \(control.label)")
            XCTAssertGreaterThan(control.frame.width, 0)
            XCTAssertGreaterThan(control.frame.height, 0)
            XCTAssertTrue(viewport.insetBy(dx: -0.5, dy: -0.5).contains(control.frame), "Toolbar control left the visible viewport: \(control.label) \(control.frame) in \(viewport)")
            for neighbor in controls.dropFirst(index + 1) {
                XCTAssertTrue(control.frame.intersection(neighbor.frame).isEmpty, "Overlapping toolbar controls: \(control.label) / \(neighbor.label)")
            }
        }
        capture(safari, name)
    }

    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
        let accessibility = XCTAttachment(string: app.debugDescription)
        accessibility.name = "\(name)-accessibility"
        accessibility.lifetime = .keepAlways
        add(accessibility)
    }
}
