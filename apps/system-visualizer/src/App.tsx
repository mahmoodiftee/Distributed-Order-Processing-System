import { Cpu } from 'lucide-react';
import { useOrderSimulation } from './hooks/useOrderSimulation';
import { ControlPanel } from './components/ControlPanel';
import { VisualizationGrid } from './components/VisualizationGrid';

export default function App() {
  const sim = useOrderSimulation();

  return (
    <div className="min-h-screen w-full bg-background flex flex-col text-foreground overflow-x-hidden">

      {/* Header */}
      <div className="h-12 bg-muted/20 border-b border-border backdrop-blur-md flex items-center justify-center shrink-0 z-10 sticky top-0">
        <h1 className="text-lg md:text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Cpu className="text-brand-orange" size={20} /> System Visualizer
        </h1>
      </div>

      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 p-4 gap-4 z-10 min-h-0">

        {/* Left Control Column */}
        <div className="lg:col-span-3 h-auto lg:h-full lg:overflow-hidden">
          <ControlPanel
            customerId={sim.customerId}
            setCustomerId={sim.setCustomerId}
            selectedProduct={sim.selectedProduct}
            setSelectedProduct={sim.setSelectedProduct}
            quantity={sim.quantity}
            setQuantity={sim.setQuantity}
            products={sim.products}
            simulateFailure={sim.simulateFailure}
            setSimulateFailure={sim.setSimulateFailure}
            simulationStatus={sim.simulationStatus}
            placeOrder={sim.placeOrder}
            toggleKillSwitch={sim.toggleKillSwitch}
            servicesState={sim.servicesState}
            sagaDb={sim.sagaDb}
            isOfflineSaga={sim.servicesState.saga.isOffline || sim.isCrashedSaga}
          />
        </div>

        {/* Right Flow Column */}
        <div className="lg:col-span-9 flex flex-col gap-4 min-w-0 h-auto lg:h-full justify-center">
          <VisualizationGrid
            servicesState={sim.servicesState}
            shakingFastService={sim.shakingFastService}
            showLightning={sim.showLightning}
            pulsingOrangeService={sim.pulsingOrangeService}
            celebratingService={sim.celebratingService}
            simulationStatus={sim.simulationStatus}
            tubeCounts={sim.tubeCounts}
            pulsingTubes={sim.pulsingTubes}
            redPulsingTubes={sim.redPulsingTubes}
            isCrashedSaga={sim.isCrashedSaga}
            getPacketsForTube={sim.getPacketsForTube}
            bannerInfo={sim.bannerInfo}
          />
        </div>

      </div>
    </div>
  );
}
