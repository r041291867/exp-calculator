import { useState } from "react";
import type { SharedLevelExp } from "../hooks/useLevelExp";
import LevelExpField from "./shared/LevelExpField";
import LevelTableDialog from "./LevelTableDialog";

export default function CharacterPanel(props: SharedLevelExp) {
    const { setCurrentLevel, setCurrentExp, ...rest } = props;
    const [dialogOpen, setDialogOpen] = useState(false);

    const handleLevelChange = (level: number) => {
        setCurrentLevel(level);
        setCurrentExp(0);
    };

    return (
        <div className="card character-panel">
            <header className="card-header">
                <span className="header-icon">👤</span>
                <h1>角色資訊</h1>
                <button
                    className="level-table-icon-btn"
                    onClick={() => setDialogOpen(true)}
                    title="等級經驗參考"
                >
                    📋
                </button>
            </header>
            <div className="character-panel-body">
                <LevelExpField
                    level={rest.currentLevel}
                    onLevelChange={handleLevelChange}
                    exp={rest.currentExp}
                    onExpChange={rest.handleExpChange}
                    mode={rest.expInputMode}
                    onModeChange={rest.setExpInputMode}
                    maxExp={rest.maxCurrentExp}
                    expPercent={rest.expPercentValue}
                />
            </div>
            <LevelTableDialog
                isOpen={dialogOpen}
                onClose={() => setDialogOpen(false)}
                currentLevel={rest.currentLevel}
            />
        </div>
    );
}
