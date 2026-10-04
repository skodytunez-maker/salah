import SwiftUI
import WidgetKit

struct SalahPrayerEntry: TimelineEntry {
    let date: Date
    let snapshot: PrayerWidgetSnapshot?
}

struct SalahPrayerProvider: TimelineProvider {
    func placeholder(in context: Context) -> SalahPrayerEntry {
        SalahPrayerEntry(date: Date(), snapshot: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (SalahPrayerEntry) -> Void) {
        let now = Date()
        completion(SalahPrayerEntry(date: now, snapshot: PrayerWidgetStore.load(now: now)))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SalahPrayerEntry>) -> Void) {
        let now = Date()

        guard let snapshot = PrayerWidgetStore.load(now: now) else {
            completion(Timeline(entries: [SalahPrayerEntry(date: now, snapshot: nil)], policy: .never))
            return
        }

        let entries = snapshot.timelineDates(from: now).map {
            SalahPrayerEntry(date: $0, snapshot: $0 < snapshot.expiresAt ? snapshot : nil)
        }

        completion(Timeline(entries: entries, policy: .never))
    }
}

private enum WidgetColors {
    static let ink = Color(red: 0.97, green: 0.96, blue: 0.94)
    static let muted = Color(red: 0.62, green: 0.68, blue: 0.76)
    static let gold = Color(red: 0.85, green: 0.76, blue: 0.56)
    static let background = LinearGradient(
        colors: [
            Color(red: 0.027, green: 0.078, blue: 0.15),
            Color(red: 0.063, green: 0.106, blue: 0.176)
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}

struct SalahPrayerWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SalahPrayerEntry

    private var next: WidgetPrayer? {
        entry.snapshot?.next(at: entry.date)
    }

    var body: some View {
        styledContent
            .foregroundStyle(WidgetColors.ink)
    }

    @ViewBuilder
    private var styledContent: some View {
        if #available(iOS 17.0, *) {
            content
                .containerBackground(for: .widget) {
                    WidgetColors.background
                }
        } else {
            content
                .padding(14)
                .background(WidgetColors.background)
        }
    }

    @ViewBuilder
    private var content: some View {
        if family == .systemMedium {
            medium
        } else {
            small
        }
    }

    private var header: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text("SALAH")
                .font(.system(size: 12, weight: .semibold, design: .serif))
                .tracking(2)
                .foregroundStyle(WidgetColors.gold)
                .fixedSize()

            Spacer(minLength: 4)

            Text(entry.snapshot?.cityName ?? "")
                .font(.system(size: 11))
                .foregroundStyle(WidgetColors.muted)
                .lineLimit(1)
                .truncationMode(.tail)
        }
    }

    private var caption: some View {
        Text("СЛЕДУЮЩИЙ НАМАЗ")
            .font(.system(size: 9, weight: .medium))
            .tracking(0.7)
            .foregroundStyle(WidgetColors.muted)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
    }

    private var small: some View {
        VStack(alignment: .leading, spacing: 4) {
            header
            Spacer(minLength: 2)
            caption

            if let next = next, let snapshot = entry.snapshot {
                Text(next.kind.title)
                    .font(.system(size: 24, weight: .medium, design: .serif))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)

                Text(snapshot.formatted(next.time))
                    .font(.system(size: 31, weight: .regular))
                    .monospacedDigit()
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)

                countdown(next)
            } else {
                empty
            }

            Spacer(minLength: 0)
        }
    }

    private var medium: some View {
        VStack(alignment: .leading, spacing: 6) {
            header

            if let next = next, let snapshot = entry.snapshot {
                HStack(alignment: .center, spacing: 8) {
                    VStack(alignment: .leading, spacing: 4) {
                        caption

                        Text(next.kind.title)
                            .font(.system(size: 27, weight: .medium, design: .serif))
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)

                        countdown(next)
                    }

                    Spacer(minLength: 4)

                    Text(snapshot.formatted(next.time))
                        .font(.system(size: 37, weight: .regular))
                        .monospacedDigit()
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
            } else {
                empty
            }

            if let snapshot = entry.snapshot, let today = snapshot.today(at: entry.date) {
                Divider()
                    .overlay(WidgetColors.muted.opacity(0.25))

                HStack(spacing: 3) {
                    ForEach(PrayerKind.allCases, id: \.rawValue) { kind in
                        let selected = next?.kind == kind && next?.day == today.date

                        VStack(spacing: 3) {
                            Text(kind.title)
                                .font(.system(size: 9))
                                .lineLimit(1)
                                .minimumScaleFactor(0.7)
                                .foregroundStyle(selected ? WidgetColors.gold : WidgetColors.muted)

                            Text(today.time(kind).map { snapshot.formatted($0) } ?? "—")
                                .font(.system(size: 12, weight: .medium))
                                .monospacedDigit()
                                .lineLimit(1)
                                .minimumScaleFactor(0.7)
                                .foregroundStyle(selected ? WidgetColors.gold : WidgetColors.ink)
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
                .accessibilityElement(children: .combine)
            }
        }
    }

    private func countdown(_ prayer: WidgetPrayer) -> some View {
        HStack(spacing: 4) {
            Text(prayer.day == entry.snapshot?.today(at: entry.date)?.date ? "через" : "завтра ·")

            Text(
                timerInterval: entry.date...max(entry.date, prayer.time),
                countsDown: true,
                showsHours: true
            )
            .monospacedDigit()
        }
        .font(.system(size: 11))
        .foregroundStyle(WidgetColors.gold)
        .lineLimit(1)
        .minimumScaleFactor(0.75)
    }

    private var empty: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text("Откройте SALAH")
                .font(.system(size: 17, weight: .medium))
                .lineLimit(2)

            Text("Обновим расписание намаза")
                .font(.system(size: 11))
                .foregroundStyle(WidgetColors.muted)
                .lineLimit(2)
        }
    }
}

@main
struct SalahPrayerWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: PrayerWidgetStore.kind, provider: SalahPrayerProvider()) { entry in
            SalahPrayerWidgetView(entry: entry)
        }
        .configurationDisplayName("Время намаза · SALAH")
        .description("Следующий намаз и расписание на сегодня. Обновляется при открытии SALAH.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
