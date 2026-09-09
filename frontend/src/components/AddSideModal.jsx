import React from 'react';

export default function AddSideModal({
  addSideTarget,
  setAddSideTarget,
  players,
  normalizePlayerSides,
  COUNTER_TEMPLATES,
  handleApplySide,
  customCounterName,
  setCustomCounterName,
  customCounterValue,
  setCustomCounterValue,
  customCounterColor,
  setCustomCounterColor,
  MTG_COLORS,
}) {
  const targetPlayer = players.find((p) => p.id === addSideTarget.playerId);
  const existingSides = targetPlayer ? normalizePlayerSides(targetPlayer) : [];
  const existingTypes = new Set(existingSides.map((s) => s.type));
  const availableTemplates = COUNTER_TEMPLATES.filter((tmpl) => !existingTypes.has(tmpl.type));

  return (
    <div
      className="add-side-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setAddSideTarget(null);
        }
      }}
    >
      <div className="add-side-modal" onClick={(e) => e.stopPropagation()}>
        <div className="add-side-modal-header">
          <span className="add-side-modal-title">
            {addSideTarget.targetIndex < 0 ? 'Add Left Counter Side' : 'Add Right Counter Side'}
          </span>
          <button
            type="button"
            className="art-search-close"
            onClick={() => setAddSideTarget(null)}
          >
            &times;
          </button>
        </div>

        {availableTemplates.length > 0 && (
          <div className="templates-section">
            <span className="modal-subheading">Choose a Preset:</span>
            <div className="templates-grid">
              {availableTemplates.map((tmpl) => (
                <button
                  key={tmpl.type}
                  type="button"
                  className="template-card-btn"
                  style={{
                    borderColor: `${tmpl.color}80`,
                    ...(tmpl.bgImage ? { backgroundImage: `linear-gradient(rgba(10,16,13,0.65), rgba(10,16,13,0.85)), url("${tmpl.bgImage}")` } : {}),
                  }}
                  onClick={() => handleApplySide({
                    type: tmpl.type,
                    label: tmpl.label,
                    value: tmpl.defaultVal,
                    color: tmpl.color,
                    bgImage: tmpl.bgImage,
                  })}
                >
                  <span className="template-icon">{tmpl.icon}</span>
                  <span className="template-name" style={{ color: tmpl.color }}>{tmpl.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Counter Builder UI */}
        <div className="custom-counter-builder">
          <span className="modal-subheading">
            {availableTemplates.length > 0 ? 'Or Create Custom Counter:' : 'Create Custom Counter:'}
          </span>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (customCounterName.trim()) {
                handleApplySide({
                  type: 'custom',
                  label: customCounterName.trim(),
                  value: customCounterValue,
                  color: customCounterColor,
                  bgImage: null,
                });
              }
            }}
            className="custom-counter-form"
          >
            <input
              type="text"
              placeholder="Counter Name (e.g. Storm, Treasure, Monarch)..."
              value={customCounterName}
              maxLength={18}
              onChange={(e) => setCustomCounterName(e.target.value)}
              className="custom-counter-input"
            />

            <div className="custom-counter-row">
              <div className="start-val-picker">
                <span className="picker-label">Start Value:</span>
                <div className="val-stepper">
                  <button type="button" className="stepper-btn" onClick={() => setCustomCounterValue((v) => v - 1)}>&minus;</button>
                  <input
                    type="number"
                    className="stepper-input"
                    value={customCounterValue}
                    onChange={(e) => setCustomCounterValue(parseInt(e.target.value, 10) || 0)}
                    aria-label="Starting value"
                  />
                  <button type="button" className="stepper-btn" onClick={() => setCustomCounterValue((v) => v + 1)}>&#43;</button>
                </div>
              </div>

              <div className="color-picker-mini">
                <span className="picker-label">Color:</span>
                <div className="color-swatches-mini">
                  {MTG_COLORS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      className="color-dot-mini"
                      style={{
                        backgroundColor: c.border,
                        borderColor: customCounterColor === c.border ? '#ffffff' : 'transparent',
                      }}
                      onClick={() => setCustomCounterColor(c.border)}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!customCounterName.trim()}
              className="create-custom-btn"
            >
              + Create Counter
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
