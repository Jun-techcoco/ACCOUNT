"use client";

import { useEffect, useState } from "react";

const formatDateForInput = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatMonthLabel = (monthStr) => {
  const [y, m] = monthStr.split("-");
  return `${y}년 ${parseInt(m)}월`;
};

const formatMonthShort = (monthStr) => {
  const [y, m] = monthStr.split("-");
  return `${y}.${m}`;
};

const formatDateDisplay = (dateStr) => {
  const parts = dateStr.split("-");
  return `${parts[1]}.${parts[2]}`;
};

const formatMoney = (n) => Number(n).toLocaleString("ko-KR");

const getMonth = (dateStr) => dateStr.substring(0, 7);

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export default function ExpenseApp({ supabase }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingMonth, setViewingMonth] = useState(getCurrentMonth());
  const [dateInput, setDateInput] = useState("");
  const [itemInput, setItemInput] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [noteInput, setNoteInput] = useState("");

  useEffect(() => {
    const todayMonth = getCurrentMonth();
    if (viewingMonth === todayMonth) {
      setDateInput(formatDateForInput(new Date()));
    } else {
      const [y, m] = viewingMonth.split("-").map(Number);
      const lastDay = new Date(y, m, 0);
      setDateInput(formatDateForInput(lastDay));
    }
  }, [viewingMonth]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("date", { ascending: true });
      if (cancelled) return;
      if (error) console.error("로드 실패:", error);
      else setExpenses(data || []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const addExpense = async () => {
    if (!dateInput) {
      alert("날짜를 선택해주세요");
      return;
    }
    const item = itemInput.trim();
    const amountRaw = amountInput.replace(/[^0-9]/g, "");
    const amount = parseInt(amountRaw);
    if (!item || !amount) return;

    const note = noteInput.trim() || null;
    const tempId = "temp-" + Date.now();

    const optimistic = {
      id: tempId,
      date: dateInput,
      item,
      amount,
      note,
      created_at: new Date().toISOString(),
    };

    setExpenses((prev) => [...prev, optimistic]);
    setItemInput("");
    setAmountInput("");
    setNoteInput("");

    const entryMonth = getMonth(dateInput);
    if (entryMonth !== viewingMonth) {
      setViewingMonth(entryMonth);
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert({ date: dateInput, item, amount, note })
      .select()
      .single();

    if (error) {
      setExpenses((prev) => prev.filter((e) => e.id !== tempId));
      alert("저장 실패: " + error.message);
    } else {
      setExpenses((prev) => prev.map((e) => (e.id === tempId ? data : e)));
    }
  };

  const deleteExpense = async (id) => {
    if (!confirm("이 기록을 삭제할까요?")) return;
    const backup = expenses;
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) {
      setExpenses(backup);
      alert("삭제 실패: " + error.message);
    }
  };

  const updateNote = async (id, value) => {
    const note = value.trim() || null;
    const { error } = await supabase
      .from("expenses")
      .update({ note })
      .eq("id", id);
    if (error) console.error(error);
  };

  const shiftMonth = (delta) => {
    const [y, m] = viewingMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setViewingMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  };

  const handleAmountInput = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setAmountInput(raw ? parseInt(raw).toLocaleString("ko-KR") : "");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") addExpense();
  };

  const monthExpenses = expenses
    .filter((e) => getMonth(e.date) === viewingMonth)
    .sort((a, b) => a.date.localeCompare(b.date));

  let runningTotal = 0;
  const withTotal = monthExpenses.map((e) => {
    runningTotal += e.amount;
    return { ...e, runningTotal };
  });
  const finalTotal = runningTotal;

  const allMonthsSet = new Set(expenses.map((e) => getMonth(e.date)));
  allMonthsSet.add(getCurrentMonth());
  allMonthsSet.add(viewingMonth);
  const allMonths = Array.from(allMonthsSet).sort();

  const today = new Date();
  const todayStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
  const isCurrent = viewingMonth === getCurrentMonth();

  return (
    <div className="page">
      <div className="container">
        <header className="header">
          <div>
            <div className="brand">카드 사용 누계</div>
            <div className="brand-sub">{todayStr}</div>
          </div>
          {isCurrent ? (
            <div className="current-badge">● 현재 달</div>
          ) : (
            <div className="past-badge">📋 지난 달 보기</div>
          )}
        </header>

        <section className="card">
          <div className="card-head">
            <div className="tag tag-blue">새 기록</div>
            <h2>빠른 추가</h2>
          </div>
          <div className="add-form">
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <input
              type="text"
              value={itemInput}
              onChange={(e) => setItemInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="품목 (예: 점심 식대)"
            />
            <input
              type="text"
              value={amountInput}
              onChange={handleAmountInput}
              onKeyDown={handleKeyDown}
              placeholder="금액"
              inputMode="numeric"
              className="amount-input"
            />
            <input
              type="text"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="비고 (선택)"
            />
            <button
              className="add-btn"
              onClick={addExpense}
              disabled={!itemInput.trim() || !amountInput || !dateInput}
            >
              + 추가
            </button>
          </div>
          <div className="add-hint">날짜 바꿔서 지난 날짜로도 입력할 수 있어요</div>
        </section>

        <section className="card">
          <div className="card-head">
            <div className="tag tag-orange">
              {formatMonthLabel(viewingMonth)} 내역
            </div>
            <h2>
              사용 내역 <span className="count">{monthExpenses.length}건</span>
            </h2>
          </div>

          {loading ? (
            <div className="empty">불러오는 중...</div>
          ) : withTotal.length === 0 ? (
            <div className="empty">이 달엔 아직 사용 기록이 없어요</div>
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 50 }}>NO.</th>
                      <th style={{ width: 80 }}>날짜</th>
                      <th>품목</th>
                      <th className="right" style={{ width: 110 }}>금액</th>
                      <th className="right" style={{ width: 130 }}>누계금액</th>
                      <th style={{ width: "25%" }}>비고</th>
                      <th className="center" style={{ width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {withTotal.map((e, idx) => (
                      <tr key={e.id}>
                        <td className="cell-num">{idx + 1}</td>
                        <td className="cell-date">{formatDateDisplay(e.date)}</td>
                        <td className="cell-item">{e.item}</td>
                        <td className="cell-amount right">{formatMoney(e.amount)}</td>
                        <td className="cell-total right">{formatMoney(e.runningTotal)}</td>
                        <td className="cell-note">
                          <input
                            type="text"
                            defaultValue={e.note || ""}
                            onBlur={(ev) => updateNote(e.id, ev.target.value)}
                            placeholder="—"
                          />
                        </td>
                        <td className="center">
                          <button
                            className="del-btn"
                            onClick={() => deleteExpense(e.id)}
                            title="삭제"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="total-banner">
                <div className="total-label">
                  {formatMonthLabel(viewingMonth)} 최종 사용액
                </div>
                <div className="total-amount">
                  <span className="won">₩</span>{formatMoney(finalTotal)}
                </div>
              </div>
            </>
          )}
        </section>

        <div className="month-nav">
          <button className="nav-btn" onClick={() => shiftMonth(-1)}>← 이전 달</button>
          <select
            className="month-select"
            value={viewingMonth}
            onChange={(e) => setViewingMonth(e.target.value)}
          >
            {allMonths.map((m) => (
              <option key={m} value={m}>
                {formatMonthShort(m)}{m === getCurrentMonth() ? " (현재)" : ""}
              </option>
            ))}
          </select>
          <button className="nav-btn" onClick={() => shiftMonth(1)}>다음 달 →</button>
        </div>

        <div className="footer-note">자동 저장 · 어디서든 같은 목록</div>
      </div>

      <style jsx>{`
        .page { min-height: 100vh; padding: 32px 20px 60px; }
        .container {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 4px 8px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .brand {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: #0f172a;
        }
        .brand-sub {
          font-size: 13px;
          color: #64748b;
          margin-top: 2px;
          font-variant-numeric: tabular-nums;
        }
        .current-badge {
          background: #fff1e6;
          color: #ea580c;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 8px;
        }
        .past-badge {
          background: #f1f5f9;
          color: #475569;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 8px;
        }

        .tag {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          letter-spacing: 0.2px;
        }
        .tag-orange { background: #fff1e6; color: #ea580c; }
        .tag-blue { background: #e0f2fe; color: #0369a1; }

        .card {
          background: white;
          border-radius: 16px;
          padding: 22px 24px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
          border: 1px solid #e2e8f0;
        }
        .card-head { margin-bottom: 16px; }
        h2 {
          font-size: 16px;
          font-weight: 700;
          margin: 8px 0 0;
          color: #0f172a;
        }
        .count {
          display: inline-block;
          margin-left: 4px;
          font-size: 14px;
          color: #94a3b8;
          font-weight: 600;
        }

        .add-form {
          display: grid;
          grid-template-columns: 150px 1.3fr 1fr 1.3fr auto;
          gap: 10px;
        }
        .add-form input {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 14px;
          color: #0f172a;
          outline: none;
          transition: all 0.15s;
        }
        .add-form input::placeholder { color: #94a3b8; }
        .add-form input:focus {
          background: white;
          border-color: #fb923c;
          box-shadow: 0 0 0 3px rgba(251, 146, 60, 0.12);
        }
        .add-form input.amount-input {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .add-form input[type="date"] {
          font-variant-numeric: tabular-nums;
          color: #475569;
        }
        .add-btn {
          background: #fb923c;
          color: white;
          border: none;
          border-radius: 10px;
          padding: 0 22px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .add-btn:hover:not(:disabled) { background: #ea580c; }
        .add-btn:disabled { background: #cbd5e1; cursor: not-allowed; }
        .add-hint {
          margin-top: 10px;
          font-size: 12px;
          color: #94a3b8;
          text-align: right;
        }

        .table-wrap {
          overflow-x: auto;
          margin: 0 -24px;
          padding: 0 24px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 640px;
        }
        thead { background: #f8fafc; }
        th {
          text-align: left;
          padding: 11px 14px;
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.5px;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
        }
        th.right { text-align: right; }
        th.center { text-align: center; }
        td {
          padding: 12px 14px;
          font-size: 14px;
          color: #0f172a;
          border-bottom: 1px solid #f1f5f9;
        }
        td.right { text-align: right; }
        td.center { text-align: center; }
        tbody tr:last-child td { border-bottom: none; }
        tbody tr:hover { background: #fafbfc; }

        .cell-num {
          color: #94a3b8;
          font-weight: 600;
          font-size: 13px;
          font-variant-numeric: tabular-nums;
        }
        .cell-date {
          color: #475569;
          font-size: 13px;
          font-variant-numeric: tabular-nums;
        }
        .cell-item { font-weight: 500; word-break: keep-all; }
        .cell-amount { font-weight: 600; font-variant-numeric: tabular-nums; }
        .cell-total {
          font-weight: 700;
          color: #ea580c;
          font-variant-numeric: tabular-nums;
        }
        .cell-note { color: #64748b; font-size: 13px; }
        .cell-note input {
          background: transparent;
          border: 1px solid transparent;
          padding: 6px 9px;
          font-size: 13px;
          width: 100%;
          color: #64748b;
          border-radius: 6px;
          outline: none;
          transition: all 0.12s;
        }
        .cell-note input:hover { background: #f8fafc; }
        .cell-note input:focus {
          background: white;
          border-color: #cbd5e1;
          color: #0f172a;
        }

        .del-btn {
          background: transparent;
          border: 1px solid #e2e8f0;
          color: #64748b;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
          transition: all 0.15s;
        }
        .del-btn:hover {
          background: #fef2f2;
          color: #dc2626;
          border-color: #fecaca;
        }

        .empty {
          text-align: center;
          padding: 40px 20px;
          color: #94a3b8;
          font-size: 14px;
        }

        .total-banner {
          background: linear-gradient(90deg, #fef3c7, #fde68a);
          border-radius: 12px;
          padding: 18px 22px;
          margin-top: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 1px solid #fcd34d;
        }
        .total-label {
          font-size: 14px;
          font-weight: 700;
          color: #78350f;
        }
        .total-amount {
          font-size: 24px;
          font-weight: 800;
          color: #78350f;
          letter-spacing: -0.5px;
          font-variant-numeric: tabular-nums;
        }
        .total-amount .won { font-size: 16px; margin-right: 4px; }

        .month-nav {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          margin-top: 12px;
          padding: 8px;
        }
        .nav-btn {
          background: white;
          border: 1px solid #e2e8f0;
          color: #0f172a;
          border-radius: 10px;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .nav-btn:hover {
          background: #fb923c;
          color: white;
          border-color: #fb923c;
        }
        .month-select {
          background: white;
          border: 1px solid #e2e8f0;
          color: #0f172a;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 14px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          cursor: pointer;
          outline: none;
          min-width: 140px;
        }
        .month-select:focus { border-color: #fb923c; }

        .footer-note {
          text-align: center;
          margin-top: 6px;
          padding: 8px;
          font-size: 12px;
          color: #94a3b8;
        }

        @media (max-width: 720px) {
          .page { padding: 20px 12px 40px; }
          .container { gap: 14px; }
          .card { padding: 18px; border-radius: 14px; }
          .add-form { grid-template-columns: 1fr; }
          .add-form input, .add-btn { padding: 12px 14px; font-size: 15px; }
          .table-wrap { margin: 0 -18px; padding: 0 18px; }
          th, td { padding: 10px 10px; font-size: 13px; }
          .total-banner { padding: 14px 16px; }
          .total-amount { font-size: 20px; }
          .nav-btn { padding: 8px 12px; font-size: 13px; }
        }
      `}</style>
    </div>
  );
}
