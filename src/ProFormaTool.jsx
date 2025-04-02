import { useState, useRef, useEffect } from "react";

const API_BASE = "https://proforma-backend.onrender.com/api/proforma";

export default function ProFormaTool() {
  const [inputs, setInputs] = useState({
    acquisitionCost: 0,
    loanAmount: 0,
    interestRate: 6.5,
    amortizationYears: 10,
    rent: 0,
    unitCount: 0,
    vacancyRate: 0.1,
    opexRate: 0.3,
    periodType: "yearly",
  });

  const [results, setResults] = useState(null);
  const [title, setTitle] = useState("");
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState(null);
  const resultRef = useRef();

  useEffect(() => {
    fetch(API_BASE)
      .then(res => res.json())
      .then(setScenarios)
      .catch(console.error);
  }, []);

  const handleChange = (e) => {
    setInputs({ ...inputs, [e.target.name]: parseFloat(e.target.value) });
  };

  const calculate = () => {
    const grossRevenue = inputs.rent * inputs.unitCount * (inputs.periodType === "yearly" ? 12 : 3);
    const vacancyLoss = grossRevenue * inputs.vacancyRate;
    const effectiveRevenue = grossRevenue - vacancyLoss;
    const opex = effectiveRevenue * inputs.opexRate;
    const noi = effectiveRevenue - opex;

    const monthlyRate = inputs.interestRate / 100 / 12;
    const months = inputs.amortizationYears * 12;
    const loanPmt =
      (inputs.loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
    const debtService = loanPmt * (inputs.periodType === "yearly" ? 12 : 3);

    const cashFlow = noi - debtService;

    setResults({ grossRevenue, vacancyLoss, effectiveRevenue, opex, noi, debtService, cashFlow });
  };

  const downloadPDF = async (ref) => {
    if (typeof window === "undefined" || !ref?.current) {
      console.warn("PDF export skipped: not in browser or ref is null.");
      return;
    }

    try {
      const html2pdf = (await import("html2pdf.js")).default;
      html2pdf().from(ref.current).set({ margin: 1, filename: 'proforma.pdf' }).save();
    } catch (error) {
      console.error("PDF export failed:", error);
    }
  };

  const saveScenario = () => {
    if (!title || !results) return alert("Please add a title and calculate results first");
    fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, inputs, results }),
    })
      .then(res => res.json())
      .then(() => alert("Scenario saved!"))
      .catch(console.error);
  };

  const loadScenario = (id) => {
    fetch(`${API_BASE}/${id}`)
      .then(res => res.json())
      .then(data => {
        setInputs(data.inputs);
        setResults(data.results);
      })
      .catch(console.error);
  };

  return (
    <div style={{ padding: '1rem', maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ background: '#fff', padding: '1rem', borderRadius: '8px', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <input type="number" name="acquisitionCost" placeholder="Acquisition Cost" onChange={handleChange} value={inputs.acquisitionCost} />
          <input type="number" name="loanAmount" placeholder="Loan Amount" onChange={handleChange} value={inputs.loanAmount} />
          <input type="number" name="interestRate" placeholder="Interest Rate (%)" onChange={handleChange} value={inputs.interestRate} />
          <input type="number" name="amortizationYears" placeholder="Amortization (Years)" onChange={handleChange} value={inputs.amortizationYears} />
          <input type="number" name="rent" placeholder="Monthly Rent per Unit" onChange={handleChange} value={inputs.rent} />
          <input type="number" name="unitCount" placeholder="Number of Units" onChange={handleChange} value={inputs.unitCount} />
          <input type="number" name="vacancyRate" placeholder="Vacancy Rate (e.g., 0.1)" onChange={handleChange} value={inputs.vacancyRate} />
          <input type="number" name="opexRate" placeholder="Operating Expense Rate (e.g., 0.3)" onChange={handleChange} value={inputs.opexRate} />
          <select
            name="periodType"
            onChange={(e) => setInputs({ ...inputs, periodType: e.target.value })}
            value={inputs.periodType}
          >
            <option value="yearly">Yearly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </div>

        <button onClick={calculate} style={{ marginTop: '1rem' }}>Calculate Pro Forma</button>

        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <input type="text" placeholder="Scenario Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <button onClick={saveScenario}>Save Scenario</button>

          <select onChange={(e) => loadScenario(e.target.value)}>
            <option>Select a saved scenario</option>
            {scenarios.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>

        {results && (
          <div ref={resultRef} style={{ marginTop: '2rem', background: '#f9f9f9', padding: '1rem', borderRadius: '8px' }}>
            <h2>Pro Forma Results</h2>
            <p><strong>Gross Revenue:</strong> ${results.grossRevenue.toFixed(2)}</p>
            <p><strong>Vacancy Loss:</strong> ${results.vacancyLoss.toFixed(2)}</p>
            <p><strong>Effective Revenue:</strong> ${results.effectiveRevenue.toFixed(2)}</p>
            <p><strong>Operating Expenses:</strong> ${results.opex.toFixed(2)}</p>
            <p><strong>Net Operating Income (NOI):</strong> ${results.noi.toFixed(2)}</p>
            <p><strong>Debt Service:</strong> ${results.debtService.toFixed(2)}</p>
            <p><strong>Cash Flow:</strong> ${results.cashFlow.toFixed(2)}</p>
            <button onClick={() => downloadPDF(resultRef)} style={{ marginTop: '1rem' }}>Export PDF</button>
          </div>
        )}
      </div>
    </div>
  );
}
