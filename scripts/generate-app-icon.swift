import AppKit

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let iconset = root.appendingPathComponent("build/AppIcon.iconset")
let assets = root.appendingPathComponent("electron/assets")
try FileManager.default.createDirectory(at: iconset, withIntermediateDirectories: true)
try FileManager.default.createDirectory(at: assets, withIntermediateDirectories: true)

func render(_ size: Int) throws -> Data {
    let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size,
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
    let transform = NSAffineTransform()
    transform.scale(by: CGFloat(size) / 1024)
    transform.concat()
    NSColor.clear.setFill()
    NSRect(x: 0, y: 0, width: 1024, height: 1024).fill()
    NSColor(srgbRed: 97/255, green: 20/255, blue: 18/255, alpha: 1).setFill()
    NSBezierPath(roundedRect: NSRect(x: 68, y: 68, width: 888, height: 888), xRadius: 190, yRadius: 190).fill()
    let text = "f." as NSString
    let attributes: [NSAttributedString.Key: Any] = [
        .font: NSFont(name: "Georgia-Bold", size: 660) ?? NSFont.boldSystemFont(ofSize: 660),
        .foregroundColor: NSColor(srgbRed: 247/255, green: 234/255, blue: 222/255, alpha: 1),
    ]
    let measured = text.size(withAttributes: attributes)
    text.draw(at: NSPoint(x: (1024 - measured.width) / 2, y: (1024 - measured.height) / 2 + 20), withAttributes: attributes)
    NSGraphicsContext.restoreGraphicsState()
    return bitmap.representation(using: .png, properties: [:])!
}

for size in [16, 32, 128, 256, 512] {
    try render(size).write(to: iconset.appendingPathComponent("icon_\(size)x\(size).png"))
    try render(size * 2).write(to: iconset.appendingPathComponent("icon_\(size)x\(size)@2x.png"))
}
try render(1024).write(to: assets.appendingPathComponent("app-icon.png"))
print("Generated macOS icon PNGs. Run iconutil -c icns build/AppIcon.iconset -o build/icon.icns")
