import Calculator from './components/Calculator';
import ExpRateCalculator from './components/ExpRateCalculator';
import AuraCalculator from './components/AuraCalculator';
import BaseRateCalculator from './components/BaseRateCalculator';
import './index.css';

export default function App() {
    return (
        <div className="app-wrapper">
            <Calculator />
            <ExpRateCalculator />
            <AuraCalculator />
            <BaseRateCalculator />
        </div>
    );
}
