import Foundation

// The app and WidgetKit extension compile this exact file. No network or account data.
enum PrayerKind: String, CaseIterable, Codable {
    case fajr = "Fajr", dhuhr = "Dhuhr", asr = "Asr", maghrib = "Maghrib", isha = "Isha"
    var title: String {
        switch self {
        case .fajr: return "Фаджр"
        case .dhuhr: return "Зухр"
        case .asr: return "Аср"
        case .maghrib: return "Магриб"
        case .isha: return "Иша"
        }
    }
}

struct WidgetPrayer: Equatable {
    let kind: PrayerKind
    let time: Date
    let day: String
}

struct WidgetPrayerDay: Codable {
    let date: String
    let prayers: [String: Double?]

    func time(_ kind: PrayerKind) -> Date? {
        guard let value = prayers[kind.rawValue] ?? nil, value.isFinite else { return nil }
        return Date(timeIntervalSince1970: value / 1000)
    }
}

struct PrayerWidgetSnapshot: Codable {
    let schemaVersion: Int
    let generatedAt: String
    let timezone: String
    let cityName: String
    let days: [WidgetPrayerDay]

    static let maximumBytes = 65536
    static let maximumDays = 14

    var zone: TimeZone { TimeZone(identifier: timezone)! }
    var calendar: Calendar {
        var value = Calendar(identifier: .gregorian)
        value.timeZone = zone
        return value
    }

    static func timestamp(_ value: String) -> Date? {
        let format = ISO8601DateFormatter()
        format.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = format.date(from: value) { return date }
        format.formatOptions = [.withInternetDateTime]
        return format.date(from: value)
    }

    static func dayKey(_ date: Date, zone: TimeZone) -> String {
        let format = DateFormatter()
        format.locale = Locale(identifier: "en_US_POSIX")
        format.calendar = Calendar(identifier: .gregorian)
        format.timeZone = zone
        format.dateFormat = "yyyy-MM-dd"
        return format.string(from: date)
    }

    private func dayStart(_ key: String) -> Date? {
        let format = DateFormatter()
        format.locale = Locale(identifier: "en_US_POSIX")
        format.calendar = calendar
        format.timeZone = zone
        format.dateFormat = "yyyy-MM-dd"
        format.isLenient = false
        guard let value = format.date(from: key), Self.dayKey(value, zone: zone) == key else { return nil }
        return value
    }

    static func decode(_ data: Data, now: Date = Date()) -> PrayerWidgetSnapshot? {
        guard !data.isEmpty, data.count <= maximumBytes,
              let raw = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              Set(raw.keys).isSubset(of: ["schemaVersion", "generatedAt", "timezone", "cityName", "calculation", "days"]),
              let rawDays = raw["days"] as? [[String: Any]], !rawDays.isEmpty,
              rawDays.count <= maximumDays else { return nil }

        for day in rawDays {
            guard Set(day.keys).isSubset(of: ["date", "prayers", "hijri"]),
                  let times = day["prayers"] as? [String: Any],
                  Set(times.keys).isSubset(of: Set(PrayerKind.allCases.map(\.rawValue) + ["Sunrise"])) else { return nil }
        }

        guard let value = try? JSONDecoder().decode(Self.self, from: data), value.isValid(at: now) else { return nil }
        return value
    }

    private func isValid(at now: Date) -> Bool {
        guard schemaVersion == 1, timezone.count <= 80, TimeZone(identifier: timezone) != nil,
              !cityName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, cityName.count <= 100,
              !cityName.unicodeScalars.contains(where: { CharacterSet.controlCharacters.contains($0) }),
              let generated = Self.timestamp(generatedAt), generated <= now.addingTimeInterval(300),
              days.count > 0, days.count <= Self.maximumDays,
              days.first?.date == Self.dayKey(generated, zone: zone) else { return false }

        var previousStart: Date?
        for day in days {
            guard let start = dayStart(day.date),
                  let end = calendar.date(byAdding: .day, value: 1, to: start) else { return false }

            if let previous = previousStart,
               calendar.date(byAdding: .day, value: 1, to: previous) != start { return false }

            var previousPrayer: Date?
            for kind in PrayerKind.allCases {
                guard let time = day.time(kind),
                      time >= start.addingTimeInterval(-6 * 3600),
                      time < end.addingTimeInterval(6 * 3600) else { return false }
                if let earlier = previousPrayer, time <= earlier { return false }
                previousPrayer = time
            }

            guard let midday = day.time(.dhuhr), Self.dayKey(midday, zone: zone) == day.date else { return false }
            previousStart = start
        }
        return true
    }

    var expiresAt: Date {
        guard let last = days.last, let start = dayStart(last.date),
              let end = calendar.date(byAdding: .day, value: 1, to: start) else { return .distantPast }
        return end
    }

    func today(at date: Date) -> WidgetPrayerDay? {
        guard date < expiresAt, let generated = Self.timestamp(generatedAt),
              generated <= date.addingTimeInterval(300) else { return nil }
        return days.first { $0.date == Self.dayKey(date, zone: zone) }
    }

    func next(at date: Date) -> WidgetPrayer? {
        guard let today = today(at: date), let index = days.firstIndex(where: { $0.date == today.date }) else { return nil }

        return days[index..<min(index + 2, days.count)].flatMap { day in
            PrayerKind.allCases.compactMap { kind -> WidgetPrayer? in
                guard let time = day.time(kind), time > date, time < expiresAt else { return nil }
                return WidgetPrayer(kind: kind, time: time, day: day.date)
            }
        }.min(by: { $0.time < $1.time })
    }

    func timelineDates(from now: Date) -> [Date] {
        guard today(at: now) != nil else { return [now] }
        var dates: Set<Date> = [now, expiresAt]

        for day in days {
            if let start = dayStart(day.date), start > now { dates.insert(start) }
            for kind in PrayerKind.allCases {
                if let time = day.time(kind), time > now, time < expiresAt { dates.insert(time) }
            }
        }

        return dates.sorted()
    }

    func formatted(_ date: Date) -> String {
        let format = DateFormatter()
        format.locale = Locale(identifier: "ru_RU")
        format.timeZone = zone
        format.dateFormat = "HH:mm"
        return format.string(from: date)
    }
}
