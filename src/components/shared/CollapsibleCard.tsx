import { forwardRef } from "react";
import { useLocalStorage } from "../../hooks/useLocalStorage";

interface Props {
    storageKey: string;
    icon: string;
    title: string;
    className?: string;
    children: React.ReactNode;
    collapsed?: boolean;
    onCollapsedChange?: (v: boolean) => void;
}

const CollapsibleCard = forwardRef<HTMLDivElement, Props>(function CollapsibleCard(
    { storageKey, icon, title, className = "", children, collapsed: externalCollapsed, onCollapsedChange },
    ref,
) {
    const [internalCollapsed, setInternalCollapsed] = useLocalStorage(storageKey, false);

    const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;
    const setCollapsed = onCollapsedChange ?? setInternalCollapsed;

    return (
        <div ref={ref} className={`card${className ? ` ${className}` : ""}${isCollapsed ? " card-collapsed" : ""}`}>
            <header
                className="card-header card-header-toggle"
                onClick={() => setCollapsed(!isCollapsed)}
            >
                <span className="header-icon">{icon}</span>
                <h1>{title}</h1>
                <span className="collapse-chevron">{isCollapsed ? "›" : "‹"}</span>
            </header>
            {!isCollapsed && children}
        </div>
    );
});

export default CollapsibleCard;
