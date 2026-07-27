import React from 'react';
import { AppHeader } from './components/layout/AppHeader';
import { AppLayout } from './components/layout/AppLayout';
import { ContainerForm } from './components/forms/ContainerForm';
import { BilletForm } from './components/forms/BilletForm';
import { OptionsPanel } from './components/forms/OptionsPanel';
import { PackingScene } from './components/visualization/PackingScene';
import { ResultsPanel } from './components/results/ResultsPanel';
import { usePackingStore } from './store/usePackingStore';
import './styles/globals.css';

const App: React.FC = () => {
  const {
    container,
    billets,
    options,
    loading,
    error,
    result,
    selectedBilletKey,
    hoveredBilletKey,
    setContainer,
    setContainerPreset,
    addBillet,
    updateBillet,
    removeBillet,
    setOptions,
    optimize,
    setSelectedBilletKey,
    setHoveredBilletKey,
  } = usePackingStore();

  const totalBillets = billets.reduce((sum, b) => sum + b.quantity, 0);
  const canOptimize =
    !loading &&
    container.length > 0 &&
    container.width > 0 &&
    container.height > 0 &&
    totalBillets > 0 &&
    billets.every(
      (b) => b.id && b.length > 0 && b.width > 0 && b.height > 0 && b.quantity > 0
    );

  return (
    <div className="app">
      <AppHeader />
      <AppLayout>
        <div className="left-panel">
          <ContainerForm
            container={container}
            onChange={setContainer}
            onPreset={setContainerPreset}
          />

          <BilletForm
            billets={billets}
            onUpdate={updateBillet}
            onRemove={removeBillet}
            onAdd={addBillet}
          />

          <OptionsPanel
            options={options}
            onChange={setOptions}
            onOptimize={optimize}
            loading={loading}
            canOptimize={canOptimize}
          />

          {/* Summary info */}
          <div className="summary-info">
            <span>钢坯类型: {billets.length}</span>
            <span>总计数量: {totalBillets}</span>
            <span>容器体积: {(container.length * container.width * container.height / 1e9).toFixed(3)} m³</span>
          </div>
        </div>

        <div className="right-panel">
          {/* Error display */}
          {error && (
            <div className="error-banner">
              <span>❌ {error}</span>
              <button onClick={() => usePackingStore.getState().clearResult()}>✕</button>
            </div>
          )}

          {/* Loading indicator */}
          {loading && (
            <div className="loading-overlay">
              <div className="loading-content">
                <div className="loading-spinner" />
                <p>正在计算最优堆积方案...</p>
                <p className="loading-sub">钢坯数量较多时可能需要一些时间</p>
              </div>
            </div>
          )}

          {/* Results */}
          {result ? (
            <div className="results-container">
              <PackingScene
                container={container}
                packedItems={result.packed_items}
                selectedKey={selectedBilletKey}
                hoveredKey={hoveredBilletKey}
                onSelectKey={setSelectedBilletKey}
                onHoverKey={setHoveredBilletKey}
              />
              <ResultsPanel
                metrics={result.metrics}
                unplacedItems={result.unplaced_items}
                selectedBilletKey={selectedBilletKey}
                hoveredBilletKey={hoveredBilletKey}
                onHoverBilletId={setHoveredBilletKey}
                onSelectBilletId={setSelectedBilletKey}
              />
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h2>输入钢坯参数并点击优化</h2>
              <p>输入容器尺寸和钢坯规格，系统将自动计算最优堆积方案</p>
              <div className="empty-hints">
                <div className="hint">
                  <span className="hint-icon">1</span>
                  设置容器尺寸（或选择预设）
                </div>
                <div className="hint">
                  <span className="hint-icon">2</span>
                  添加钢坯类型，输入尺寸和数量
                </div>
                <div className="hint">
                  <span className="hint-icon">3</span>
                  调整打包选项，点击优化按钮
                </div>
                <div className="hint">
                  <span className="hint-icon">4</span>
                  查看 3D 堆积结果和统计数据
                </div>
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    </div>
  );
};

export default App;
