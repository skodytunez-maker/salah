import Foundation

func require(_ value: @autoclosure () -> Bool, _ message: String) {
    if !value() { fatalError("FAIL: " + message) }
}

let now = ISO8601DateFormatter().date(from: "2026-10-04T07:00:00Z")!
let zone = TimeZone(identifier: "Asia/Yekaterinburg")!

func fixture(day: String, hours: [Int] = [5, 13, 16, 19, 21]) -> [String: Any] {
    let base = ISO8601DateFormatter().date(from: day + "T00:00:00+05:00")!
    var times: [String: Any] = [:]

    for (kind, hour) in zip(PrayerKind.allCases, hours) {
        times[kind.rawValue] = base.addingTimeInterval(Double(hour * 3600)).timeIntervalSince1970 * 1000
    }

    return ["date": day, "prayers": times, "hijri": ["ignored": "not retained"]]
}

var raw: [String: Any] = [
    "schemaVersion": 1,
    "generatedAt": "2026-10-04T07:00:00.000Z",
    "cityName": "Тюмень",
    "timezone": zone.identifier,
    "calculation": ["method": 3, "school": 1],
    "days": [
        fixture(day: "2026-10-04"),
        fixture(day: "2026-10-05")
    ]
]

func decode(_ value: [String: Any], at date: Date = now) -> PrayerWidgetSnapshot? {
    PrayerWidgetSnapshot.decode(try! JSONSerialization.data(withJSONObject: value), now: date)
}

let snapshot = decode(raw)!
require(snapshot.next(at: now)?.kind == .dhuhr, "Next prayer uses supplied times")
require(snapshot.formatted(snapshot.next(at: now)!.time) == "13:00", "City timezone, not machine timezone")

let dhuhr = snapshot.days[0].time(.dhuhr)!
require(snapshot.next(at: dhuhr)?.kind == .asr, "Switch at prayer boundary")

let afterIsha = snapshot.days[0].time(.isha)!.addingTimeInterval(1)
require(snapshot.next(at: afterIsha)?.kind == .fajr, "After Isha use next day's Fajr")
require(snapshot.next(at: afterIsha)?.day == "2026-10-05", "Tomorrow label")

let tomorrow = ISO8601DateFormatter().date(from: "2026-10-05T00:00:00+05:00")!
require(snapshot.today(at: tomorrow)?.date == "2026-10-05", "Midnight changes timetable")
require(snapshot.today(at: snapshot.expiresAt) == nil, "Never reuse yesterday as today")
require(snapshot.next(at: snapshot.expiresAt) == nil, "Expired schedule is empty")

let timeline = snapshot.timelineDates(from: now)
require(timeline == timeline.sorted() && Set(timeline).count == timeline.count, "Sorted unique timeline")
require(timeline.contains(dhuhr) && timeline.contains(tomorrow), "Timeline covers prayers and midnight")
require(timeline.last == snapshot.expiresAt, "Explicit empty expiry entry")
require(timeline.count <= 6 * 14 + 2, "Bounded timeline, no per-second jobs")

var bad = raw
bad["timezone"] = "invalid/zone"
require(decode(bad) == nil, "Bad timezone")

bad = raw
bad["schemaVersion"] = 99
require(decode(bad) == nil, "Unknown schema")

bad = raw
bad["email"] = "private@example.test"
require(decode(bad) == nil, "Reject root private fields")

bad = raw
bad["cityName"] = "\nТюмень"
require(decode(bad) == nil, "Reject controls")

bad = raw
bad["generatedAt"] = "2026-10-06T07:00:00Z"
require(decode(bad) == nil, "Clock/future data guard")

bad = raw
bad["days"] = [fixture(day: "2026-10-05")]
require(decode(bad) == nil, "Missing starting day")

bad = raw
bad["days"] = [fixture(day: "2026-10-04"), fixture(day: "2026-10-06")]
require(decode(bad) == nil, "Missing day is not silently skipped")

bad = raw
bad["days"] = [fixture(day: "2026-10-04"), fixture(day: "2026-10-04")]
require(decode(bad) == nil, "Duplicate day")

bad = raw
bad["days"] = [fixture(day: "2026-10-04", hours: [5, 16, 13, 19, 21])]
require(decode(bad) == nil, "Out of order times")

bad = raw
bad["days"] = [] as [[String: Any]]
require(decode(bad) == nil, "Empty input")

let encoded = String(data: try! JSONEncoder().encode(snapshot), encoding: .utf8)!
require(!encoded.contains("ignored") && !encoded.contains("calculation"), "Typed store strips provider metadata")
require(!encoded.contains("latitude") && !encoded.contains("longitude"), "No precise location")

var berlin = raw
berlin["cityName"] = "Берлин"
berlin["timezone"] = "Europe/Berlin"
berlin["generatedAt"] = "2026-10-25T00:00:00Z"
let berlinNow = ISO8601DateFormatter().date(from: "2026-10-25T00:00:00Z")!
let berlinPrayers = Dictionary(
    uniqueKeysWithValues: zip(PrayerKind.allCases, [5, 12, 15, 18, 20]).map { kind, hour in
        (kind.rawValue, berlinNow.addingTimeInterval(Double(hour * 3600)).timeIntervalSince1970 * 1000)
    }
)
berlin["days"] = [["date": "2026-10-25", "prayers": berlinPrayers]]
let dst = decode(berlin, at: berlinNow)!
require(
    dst.expiresAt == ISO8601DateFormatter().date(from: "2026-10-25T23:00:00Z")!,
    "DST local end of day"
)

if CommandLine.arguments.count > 1 {
    let data = try! Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1]))
    let jsSnapshot = PrayerWidgetSnapshot.decode(data, now: now)
    require(jsSnapshot?.next(at: now)?.kind == .dhuhr, "Actual JavaScript export is readable by Swift")
    require(jsSnapshot?.formatted(jsSnapshot!.next(at: now)!.time) == "13:00", "JS/Swift time parity")
}

print("PASS: Swift widget model, prayer boundaries, tomorrow, midnight, expiry, DST, invalid data, privacy and bounded timeline")
