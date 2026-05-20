interface Props {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
}

export default function PrayerCheckbox({ checked, onChange, label = "祈禱（0.25 倍）" }: Props) {
    return (
        <div className="field">
            <label className="prayer-checkbox-row">
                <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
                <span>{label}</span>
            </label>
        </div>
    );
}
