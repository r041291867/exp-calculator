import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
    content: string;
}

export default function Tooltip({ content }: TooltipProps) {
    const [visible, setVisible] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const iconRef = useRef<HTMLSpanElement>(null);

    const show = () => {
        if (!iconRef.current) return;
        const rect = iconRef.current.getBoundingClientRect();
        setPos({
            top: rect.bottom + 6,
            left: rect.left + rect.width / 2,
        });
        setVisible(true);
    };

    const hide = () => setVisible(false);

    useEffect(() => {
        if (!visible) return;
        const onScroll = () => hide();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [visible]);

    return (
        <span className="info-tooltip">
            <span
                ref={iconRef}
                className="info-tooltip-icon"
                onMouseEnter={show}
                onMouseLeave={hide}
            >
                ?
            </span>
            {visible &&
                createPortal(
                    <span
                        className="info-tooltip-content"
                        style={{ top: pos.top, left: pos.left }}
                    >
                        {content}
                    </span>,
                    document.body
                )}
        </span>
    );
}
