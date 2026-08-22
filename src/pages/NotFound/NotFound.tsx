import { ArrowLeft, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

import "./NotFound.scss";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <main className="not-found">
      <section className="not-found__card">
        <span>404</span>
        <h1>Sahifa topilmadi</h1>
        <p>Bu manzil mavjud emas yoki ko'chirilgan.</p>
        <div className="not-found__actions">
          <button type="button" onClick={() => navigate(-1)}><ArrowLeft size={15} />Orqaga</button>
          <button type="button" onClick={() => navigate("/dashboard")}><Home size={15} />Bosh sahifa</button>
        </div>
      </section>
    </main>
  );
};

export default NotFound;
