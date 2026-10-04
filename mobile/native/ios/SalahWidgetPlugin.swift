import Foundation
import Capacitor
import WidgetKit

@objc(SalahWidgetPlugin)
public class SalahWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SalahWidgetPlugin"
    public let jsName = "SalahWidget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "updateSnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearSnapshot", returnType: CAPPluginReturnPromise)
    ]

    @objc func updateSnapshot(_ call: CAPPluginCall) {
        guard let raw = call.getObject("snapshot"),
              JSONSerialization.isValidJSONObject(raw),
              let data = try? JSONSerialization.data(withJSONObject: raw),
              let snapshot = PrayerWidgetSnapshot.decode(data) else {
            call.reject("Расписание виджета не прошло проверку.")
            return
        }

        do {
            try PrayerWidgetStore.save(snapshot)
            WidgetCenter.shared.reloadTimelines(ofKind: PrayerWidgetStore.kind)
            call.resolve()
        } catch {
            call.reject("Не удалось сохранить расписание виджета. Проверьте настройку App Group.")
        }
    }

    @objc func clearSnapshot(_ call: CAPPluginCall) {
        do {
            try PrayerWidgetStore.clear()
            WidgetCenter.shared.reloadTimelines(ofKind: PrayerWidgetStore.kind)
            call.resolve()
        } catch {
            call.reject("Не удалось очистить расписание виджета.")
        }
    }
}
