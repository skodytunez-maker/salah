import Capacitor

class SalahBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(SalahWidgetPlugin())
    }
}
