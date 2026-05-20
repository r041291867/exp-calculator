import { useLocalStorage } from "../../hooks/useLocalStorage";

interface Props {
    storageKey: string;
    icon: string;
    title: string;
    className?: string;
    children: React.ReactNode;
}

export default function CollapsibleCard({ storageKey, icon, title, className = "", children }: Props) {
    const [collapsed, setCollapsed] = useLocalStorage(storageKey, false);

    return (
        <div className={`card${className ? ` ${className}` : ""}${collapsed ? " card-collapsed" : ""}`}>
            <header
                className="card-header card-header-toggle"
                onClick={() => setCollapsed((v) => !v)}
            >
                <span className="header-icon">{icon}</span>
                <h1>{title}</h1>
                <span className="collapse-chevron">{collapsed ? "›" : "‹"}</span>
            </header>
            {!collapsed && children}
        </div>
    );
}
