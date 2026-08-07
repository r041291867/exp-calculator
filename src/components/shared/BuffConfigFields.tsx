import type { BuffConfig } from "../../utils/aura";
import PrayerCheckbox from "./PrayerCheckbox";

interface HottimeFieldProps {
    checked: boolean;
    onCheckedChange: (v: boolean) => void;
    multiplier: number;
    onMultiplierChange: (v: number) => void;
}

function HottimeField({ checked, onCheckedChange, multiplier, onMultiplierChange }: HottimeFieldProps) {
    return (
        <div className="field">
            <div className="buff-row">
                <label className="prayer-checkbox-row">
                    <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} />
                    <span>Hot Time</span>
                </label>
                {checked && (
                    <div className="buff-inline-input">
                        <input
                            type="number"
                            min={1}
                            step={0.25}
                            value={multiplier || ""}
                            onChange={(e) => onMultiplierChange(Number(e.target.value))}
                            onBlur={() => onMultiplierChange(Math.max(1, multiplier || 1))}
                        />
                        <span className="unit-label">倍</span>
                    </div>
                )}
            </div>
        </div>
    );
}

interface AuraInlineFieldsProps {
    triggers: number;
    onTriggersChange: (v: number) => void;
    duration: number;
    onDurationChange: (v: number) => void;
    multiplier: number;
    onMultiplierChange: (v: number) => void;
}

function AuraInlineFields({
    triggers,
    onTriggersChange,
    duration,
    onDurationChange,
    multiplier,
    onMultiplierChange,
}: AuraInlineFieldsProps) {
    return (
        <div className="aura-inline">
            <input
                type="number"
                min={0}
                value={triggers || ""}
                onChange={(e) => onTriggersChange(Number(e.target.value))}
                onBlur={() => onTriggersChange(Math.max(0, triggers || 0))}
            />
            <span className="aura-inline-unit">次×</span>
            <input
                type="number"
                min={0.5}
                step={0.5}
                value={duration || ""}
                onChange={(e) => onDurationChange(Number(e.target.value))}
                onBlur={() => onDurationChange(Math.max(0.5, duration || 0.5))}
            />
            <span className="aura-inline-unit">分×</span>
            <input
                type="number"
                min={1}
                step={0.25}
                value={multiplier || ""}
                onChange={(e) => onMultiplierChange(Number(e.target.value))}
                onBlur={() => onMultiplierChange(Math.max(1, multiplier || 1))}
            />
            <span className="aura-inline-unit">倍</span>
        </div>
    );
}

interface Props {
    config: BuffConfig;
    setField: <K extends keyof BuffConfig>(field: K, value: BuffConfig[K]) => void;
}

export default function BuffConfigFields({ config, setField }: Props) {
    return (
        <div className="rate-col-form">
            <div className="field">
                <div className="buff-checkbox-row">
                    <PrayerCheckbox checked={config.hasPrayer} onChange={(v) => setField("hasPrayer", v)} />
                    <PrayerCheckbox
                        checked={config.hasDoubleCard}
                        onChange={(v) => setField("hasDoubleCard", v)}
                        label="加倍卷"
                    />
                </div>
            </div>

            <HottimeField
                checked={config.hasHottime}
                onCheckedChange={(v) => setField("hasHottime", v)}
                multiplier={config.hottimeMult}
                onMultiplierChange={(v) => setField("hottimeMult", v)}
            />

            <div className="field">
                <div className="buff-row">
                    <label className="prayer-checkbox-row">
                        <input
                            type="checkbox"
                            checked={config.hasAura}
                            onChange={(e) => setField("hasAura", e.target.checked)}
                        />
                        <span>氣場</span>
                    </label>
                    {config.hasAura && (
                        <AuraInlineFields
                            triggers={config.auraTriggers}
                            onTriggersChange={(v) => setField("auraTriggers", v)}
                            duration={config.auraDuration}
                            onDurationChange={(v) => setField("auraDuration", v)}
                            multiplier={config.auraMultiplier}
                            onMultiplierChange={(v) => setField("auraMultiplier", v)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
