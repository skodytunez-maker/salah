import Foundation

enum PrayerWidgetStore {
    static let kind = "SALAHPrayerWidget"

    private static func fileURL() throws -> URL {
        guard let group = Bundle.main.object(forInfoDictionaryKey: "SALAHAppGroup") as? String,
              group.hasPrefix("group."),
              let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) else {
            throw StoreError.groupUnavailable
        }
        return container.appendingPathComponent("prayer-widget-v1.json", isDirectory: false)
    }

    static func load(now: Date = Date()) -> PrayerWidgetSnapshot? {
        guard let url = try? fileURL(), let data = try? Data(contentsOf: url),
              let snapshot = PrayerWidgetSnapshot.decode(data, now: now), snapshot.today(at: now) != nil else { return nil }
        return snapshot
    }

    static func save(_ snapshot: PrayerWidgetSnapshot) throws {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        let data = try encoder.encode(snapshot)
        guard data.count <= PrayerWidgetSnapshot.maximumBytes else { throw StoreError.invalidData }
        try data.write(to: fileURL(), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    }

    static func clear() throws {
        let url = try fileURL()
        if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) }
    }

    enum StoreError: Error {
        case groupUnavailable
        case invalidData
    }
}
