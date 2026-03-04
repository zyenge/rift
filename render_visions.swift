import Foundation
import AVFoundation
import CoreGraphics
import CoreText
import AppKit

struct Scene {
    let title: String
    let body: String
    let duration: Double
    let topColor: CGColor
    let bottomColor: CGColor
    let accent: CGColor
}

struct VideoSpec {
    let outputName: String
    let headline: String
    let scenes: [Scene]
}

let width = 1080
let height = 1920
let fps = 30
let timescale: Int32 = Int32(fps)

func color(_ r: CGFloat, _ g: CGFloat, _ b: CGFloat) -> CGColor {
    CGColor(red: r / 255.0, green: g / 255.0, blue: b / 255.0, alpha: 1.0)
}

func drawParagraph(_ text: String, in rect: CGRect, fontSize: CGFloat, weight: NSFont.Weight, color: CGColor, context: CGContext, lineSpacing: CGFloat = 6) {
    let font = NSFont.systemFont(ofSize: fontSize, weight: weight)
    let nsColor = NSColor(cgColor: color) ?? .white
    let style = NSMutableParagraphStyle()
    style.lineBreakMode = .byWordWrapping
    style.alignment = .left
    style.lineSpacing = lineSpacing

    let attrs: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: nsColor,
        .paragraphStyle: style
    ]

    (text as NSString).draw(with: rect, options: [.usesLineFragmentOrigin, .usesFontLeading], attributes: attrs)
}

func makePixelBufferPoolAdaptor(writerInput: AVAssetWriterInput, width: Int, height: Int) -> AVAssetWriterInputPixelBufferAdaptor {
    let attributes: [String: Any] = [
        kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32ARGB),
        kCVPixelBufferWidthKey as String: width,
        kCVPixelBufferHeightKey as String: height,
        kCVPixelBufferCGBitmapContextCompatibilityKey as String: true,
        kCVPixelBufferCGImageCompatibilityKey as String: true
    ]
    return AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: writerInput, sourcePixelBufferAttributes: attributes)
}

func renderFrame(frameIndex: Int, spec: VideoSpec, sceneBoundaries: [Int], totalFrames: Int) -> CVPixelBuffer? {
    var sceneIndex = 0
    for i in 0..<sceneBoundaries.count {
        if frameIndex >= sceneBoundaries[i] {
            sceneIndex = i
        } else {
            break
        }
    }

    let scene = spec.scenes[min(sceneIndex, spec.scenes.count - 1)]
    let sceneStart = sceneBoundaries[sceneIndex]
    let sceneEnd = sceneIndex + 1 < sceneBoundaries.count ? sceneBoundaries[sceneIndex + 1] : totalFrames
    let sceneLen = max(sceneEnd - sceneStart, 1)
    let t = CGFloat(frameIndex - sceneStart) / CGFloat(sceneLen)

    var pixelBufferOut: CVPixelBuffer?
    let result = CVPixelBufferCreate(kCFAllocatorDefault, width, height, kCVPixelFormatType_32ARGB, nil, &pixelBufferOut)
    if result != kCVReturnSuccess || pixelBufferOut == nil {
        return nil
    }

    guard let pixelBuffer = pixelBufferOut else { return nil }

    CVPixelBufferLockBaseAddress(pixelBuffer, [])
    defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, []) }

    guard let baseAddress = CVPixelBufferGetBaseAddress(pixelBuffer) else { return nil }

    let bytesPerRow = CVPixelBufferGetBytesPerRow(pixelBuffer)
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    guard let context = CGContext(
        data: baseAddress,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: bytesPerRow,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue
    ) else {
        return nil
    }

    context.setAllowsAntialiasing(true)
    context.interpolationQuality = .high

    // Background gradient with subtle animated shift.
    let shift = CGFloat(sin(Double(frameIndex) * 0.03)) * 120
    let start = CGPoint(x: CGFloat(width) * 0.2 + shift, y: CGFloat(height))
    let end = CGPoint(x: CGFloat(width) * 0.8 - shift, y: 0)

    if let gradient = CGGradient(colorsSpace: colorSpace, colors: [scene.topColor, scene.bottomColor] as CFArray, locations: [0.0, 1.0]) {
        context.drawLinearGradient(gradient, start: start, end: end, options: [])
    }

    // Ambient soft circles for depth.
    context.setFillColor(scene.accent.copy(alpha: 0.22) ?? scene.accent)
    let pulse = 1.0 + 0.15 * sin(CGFloat(frameIndex) * 0.08)
    context.fillEllipse(in: CGRect(x: 100, y: 1200, width: 440 * pulse, height: 440 * pulse))
    context.fillEllipse(in: CGRect(x: 640, y: 260, width: 320 * pulse, height: 320 * pulse))

    context.setFillColor(CGColor(red: 0, green: 0, blue: 0, alpha: 0.34))
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))

    // Card panel.
    let panelRect = CGRect(x: 72, y: 260, width: 936, height: 1260)
    let panelPath = CGPath(roundedRect: panelRect, cornerWidth: 36, cornerHeight: 36, transform: nil)
    context.setFillColor(CGColor(red: 0.03, green: 0.05, blue: 0.10, alpha: 0.52))
    context.addPath(panelPath)
    context.fillPath()

    context.setStrokeColor(scene.accent.copy(alpha: 0.88) ?? scene.accent)
    context.setLineWidth(3)
    context.addPath(panelPath)
    context.strokePath()

    // Draw text using top-left coordinates by flipping context.
    context.saveGState()
    context.translateBy(x: 0, y: CGFloat(height))
    context.scaleBy(x: 1, y: -1)

    let progress = Int((Double(frameIndex) / Double(totalFrames)) * 100)
    drawParagraph("OMNI VISION FILM", in: CGRect(x: 124, y: 455, width: 520, height: 50), fontSize: 30, weight: .regular, color: scene.accent, context: context)
    drawParagraph("\(progress)%", in: CGRect(x: 860, y: 455, width: 120, height: 50), fontSize: 30, weight: .bold, color: CGColor.white, context: context)
    drawParagraph(spec.headline, in: CGRect(x: 124, y: 540, width: 820, height: 150), fontSize: 58, weight: .black, color: CGColor.white, context: context, lineSpacing: 10)
    drawParagraph(scene.title, in: CGRect(x: 124, y: 760, width: 820, height: 120), fontSize: 46, weight: .semibold, color: scene.accent, context: context)
    drawParagraph(scene.body, in: CGRect(x: 124, y: 900, width: 820, height: 500), fontSize: 37, weight: .regular, color: CGColor.white, context: context, lineSpacing: 12)

    let cue = sceneIndex < spec.scenes.count - 1 ? "Next chapter loading..." : "Omni: See it now, from someone there."
    let alpha = min(max((t - 0.6) * 2.5, 0), 1)
    drawParagraph(cue, in: CGRect(x: 124, y: 1390, width: 820, height: 80), fontSize: 30, weight: .medium, color: scene.accent.copy(alpha: alpha) ?? scene.accent, context: context)

    context.restoreGState()

    return pixelBuffer
}

func renderVideo(_ spec: VideoSpec, outputURL: URL) throws {
    if FileManager.default.fileExists(atPath: outputURL.path) {
        try FileManager.default.removeItem(at: outputURL)
    }

    let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mov)

    let settings: [String: Any] = [
        AVVideoCodecKey: AVVideoCodecType.proRes422,
        AVVideoWidthKey: width,
        AVVideoHeightKey: height,
        AVVideoCompressionPropertiesKey: [
            AVVideoAverageBitRateKey: 8_000_000
        ]
    ]

    let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
    input.expectsMediaDataInRealTime = false

    guard writer.canAdd(input) else {
        throw NSError(domain: "Render", code: 1, userInfo: [NSLocalizedDescriptionKey: "Cannot add video input"])
    }
    writer.add(input)

    let adaptor = makePixelBufferPoolAdaptor(writerInput: input, width: width, height: height)

    guard writer.startWriting() else {
        throw writer.error ?? NSError(domain: "Render", code: 2, userInfo: [NSLocalizedDescriptionKey: "Failed to start writing"])
    }

    writer.startSession(atSourceTime: .zero)

    var sceneBoundaries: [Int] = []
    var running = 0
    for scene in spec.scenes {
        sceneBoundaries.append(running)
        running += Int(scene.duration * Double(fps))
    }
    let totalFrames = max(running, 1)

    let queue = DispatchQueue(label: "video.render.queue")
    let group = DispatchGroup()
    group.enter()

    var frame = 0
    input.requestMediaDataWhenReady(on: queue) {
        while input.isReadyForMoreMediaData && frame < totalFrames {
            autoreleasepool {
                let time = CMTime(value: CMTimeValue(frame), timescale: timescale)
                if let pixelBuffer = renderFrame(frameIndex: frame, spec: spec, sceneBoundaries: sceneBoundaries, totalFrames: totalFrames) {
                    _ = adaptor.append(pixelBuffer, withPresentationTime: time)
                }
                frame += 1
            }
        }

        if frame >= totalFrames {
            input.markAsFinished()
            writer.finishWriting {
                group.leave()
            }
        }
    }

    group.wait()

    if writer.status != .completed {
        throw writer.error ?? NSError(domain: "Render", code: 3, userInfo: [NSLocalizedDescriptionKey: "Writer did not complete"])
    }
}

let vision1 = VideoSpec(
    outputName: "vision-1-utility.mov",
    headline: "Vision 1: Real-Time Utility",
    scenes: [
        Scene(
            title: "The Decision",
            body: "It is 6:10 PM in Manhattan. A busy city dweller stands outside the subway, asking one practical question before the detour: Is Trader Joe's checkout line short enough to be worth the trip?",
            duration: 7,
            topColor: color(30, 62, 109),
            bottomColor: color(13, 22, 44),
            accent: color(255, 210, 125)
        ),
        Scene(
            title: "The Live Answer",
            body: "A nearby Omni responder shares a fresh visual in minutes. Not a stale review. Not a guess. A real, current look at the line, exactly when the decision matters.",
            duration: 7,
            topColor: color(19, 91, 98),
            bottomColor: color(8, 38, 47),
            accent: color(124, 241, 214)
        ),
        Scene(
            title: "The Outcome",
            body: "Line is short. The user goes. No wasted trip, no uncertainty, no evening lost in checkout chaos. Omni turns city friction into confidence, one grounded decision at a time.",
            duration: 7,
            topColor: color(89, 68, 23),
            bottomColor: color(36, 27, 10),
            accent: color(255, 183, 92)
        )
    ]
)

let vision2 = VideoSpec(
    outputName: "vision-2-emotional-presence.mov",
    headline: "Vision 2: Emotional Presence",
    scenes: [
        Scene(
            title: "A Quiet Evening in NYC",
            body: "A mom in New York sits with her toddler after dinner. She opens Omni, not for errands, but for something deeper: to share where she came from.",
            duration: 7,
            topColor: color(88, 42, 76),
            bottomColor: color(26, 11, 29),
            accent: color(255, 169, 211)
        ),
        Scene(
            title: "A Window to Home",
            body: "Within minutes, a live video arrives from her remote village. The road, the trees, the evening light, the sounds she remembers. Her child sees that place in the present, not as an old photo.",
            duration: 7,
            topColor: color(32, 102, 74),
            bottomColor: color(12, 42, 31),
            accent: color(156, 244, 172)
        ),
        Scene(
            title: "Memory Becomes Connection",
            body: "She tells stories while her toddler watches the village move in real time. Omni becomes more than an app. It becomes a bridge between generations, distance, and identity.",
            duration: 7,
            topColor: color(122, 69, 42),
            bottomColor: color(38, 21, 12),
            accent: color(255, 208, 148)
        )
    ]
)

let outputDir = URL(fileURLWithPath: "/Users/zhen/Documents/projects/omni")

for spec in [vision1, vision2] {
    do {
        let url = outputDir.appendingPathComponent(spec.outputName)
        try renderVideo(spec, outputURL: url)
        print("Rendered: \(url.path)")
    } catch {
        fputs("Failed rendering \(spec.outputName): \(error)\n", stderr)
        exit(1)
    }
}

print("All videos rendered.")
