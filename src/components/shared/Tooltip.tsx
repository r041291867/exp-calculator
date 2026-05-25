import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
    content: string;
}

export default function Tooltip({ content }: TooltipProps) {
    const [visible, setVisible] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const iconRef = useRef<HTMLSpanElement>(null);
    const tooltipRef = useRef<HTMLSpanElement>(null);

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

    // Clamp tooltip within viewport after it renders
    useLayoutEffect(() => {
        if (!visible || !tooltipRef.current) return;
        const tipRect = tooltipRef.current.getBoundingClientRect();
        const padding = 8;
        const vw = window.innerWidth;
        let newLeft = pos.left;
        if (tipRect.right > vw - padding) newLeft -= tipRect.right - (vw - padding);
        if (tipRect.left < padding) newLeft += padding - tipRect.left;
        if (newLeft !== pos.left) setPos((p) => ({ ...p, left: newLeft }));
    }, [visible]);

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
                        ref={tooltipRef}
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
