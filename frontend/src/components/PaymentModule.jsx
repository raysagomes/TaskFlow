import React, { useState } from "react";

export default function PaymentModule({ onPaymentSuccess }) {
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState(null);

  const handlePayment = (e) => {
    e.preventDefault();

    if (
      cardNumber.length !== 16 ||
      !cardName ||
      expiry.length !== 5 ||
      cvv.length !== 3
    ) {
      let message = "Por favor, preencha todos os dados corretamente.";
      if (cardNumber.length !== 16)
        message = "O número do cartão deve ter 16 dígitos.";
      else if (!cardName) message = "O nome no cartão é obrigatório.";
      else if (expiry.length !== 5)
        message = "A validade deve estar no formato MM/AA.";
      else if (cvv.length !== 3) message = "O CVV deve ter 3 dígitos.";
      setError(message);
      return;
    }

    setError("");
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      alert("Pagamento aprovado! Você agora é usuário premium.");
      if (onPaymentSuccess) onPaymentSuccess();
    }, 2000);
  };

  const fieldHints = {
    cardNumber: "O número do cartão deve ter 16 dígitos.",
    cardName: "Digite exatamente como aparece no cartão.",
    expiry: "Formato MM/AA. Ex: 12/26",
    cvv: "Os 3 dígitos no verso do cartão.",
  };
  return (
    <form onSubmit={handlePayment}>
      <div>
        <label>Número do Cartão:</label>
        <input
          type="text"
          maxLength="16"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ""))}
          onFocus={() => setFocusedField("cardNumber")}
          onBlur={() => setFocusedField(null)}
          placeholder="1234123412341234"
          required
        />
        {focusedField === "cardNumber" && <p>{fieldHints.cardNumber}</p>}
      </div>

      <div>
        <label>Nome no Cartão:</label>
        <input
          type="text"
          value={cardName}
          onChange={(e) => setCardName(e.target.value)}
          onFocus={() => setFocusedField("cardName")}
          onBlur={() => setFocusedField(null)}
          placeholder="Seu nome"
          required
        />
        {focusedField === "cardName" && <p>{fieldHints.cardName}</p>}
      </div>

      <div>
        <label>Validade (MM/AA):</label>
        <input
          type="text"
          maxLength="5"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          onFocus={() => setFocusedField("expiry")}
          onBlur={() => setFocusedField(null)}
          placeholder="12/25"
          required
        />
        {focusedField === "expiry" && <p>{fieldHints.expiry}</p>}
      </div>

      <div>
        <label>CVV:</label>
        <input
          type="password"
          maxLength="3"
          value={cvv}
          onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
          onFocus={() => setFocusedField("cvv")}
          onBlur={() => setFocusedField(null)}
          placeholder="123"
          required
        />
        {focusedField === "cvv" && <p>{fieldHints.cvv}</p>}
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <button type="submit" disabled={loading}>
        {loading ? "Processando..." : "Pagar e Ativar Premium"}
      </button>
    </form>
  );
}
