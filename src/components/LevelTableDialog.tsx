import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { EXP_TABLE } from "../data/expTable";
import { formatNumber } from "../utils/format";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    currentLevel: number;
}

export default function LevelTableDialog({ isOpen, onClose, currentLevel }: Props) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const currentRowRef = useRef<HTMLTableRowElement>(null);

    useEffect(() => {
        const el = dialogRef.current;
        if (!el) return;
        el.showModal();
        setTimeout(() => {
            currentRowRef.current?.scrollIntoView({ block: "center" });
        }, 0);
    }, [isOpen]);

    const entries = EXP_TABLE.filter((e) => e.expToNext > 0);

    if (!isOpen) return null;

    return createPortal(
        <dialog
            ref={dialogRef}
            className="level-table-dialog"
            onClose={onClose}
            onClick={(e) => { if (e.target === dialogRef.current) onClose(); }}
        >
            <header className="level-table-dialog-header">
                <span>等級經驗參考</span>
                <button className="dialog-close-btn" onClick={onClose}>✕</button>
            </header>
            <div className="level-table-dialog-body">
                <table className="level-table">
                    <thead>
                        <tr>
                            <th>等級</th>
                            <th className="text-right">升級所需經驗</th>
                            <th className="text-right">累計總經驗</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map((entry) => (
                            <tr
                                key={entry.level}
                                ref={entry.level === currentLevel ? currentRowRef : undefined}
                                className={entry.level === currentLevel ? "current-level-row" : ""}
                            >
                                <td>{entry.level}</td>
                                <td className="text-right">{formatNumber(entry.expToNext)}</td>
                                <td className="text-right">{formatNumber(entry.cumulativeExp)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </dialog>,
        document.body
    );
}
