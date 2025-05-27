import React from 'react';
import Sidebar from '../components/Sidebar';
import '../styles/pagamentos.css';
import { FaCheck } from 'react-icons/fa';
import { FaReceipt, FaArrowLeft, FaArrowRight } from 'react-icons/fa';

export default function Pagamentos() {

    const pagamentos = [
        { nome: 'Condomínio', status: 'pago' },
        { nome: 'Taxa X', status: 'pago' },
        { nome: 'Taxa Y', status: 'pago' },
    ];

    return (
        <div style={{ display: 'flex', height: '100vh' }}>
            <div
                className="sidebar-container"
                style={{ width: '250px', marginTop: '60px' }}
            >
                <Sidebar />
            </div>
            <div className="pagamentos-container">
                <div className="pagamentos-header">
                    <h1>Pagamentos<FaReceipt size={50} className="icon-header" /></h1>

                </div>

                <div className="alerta-nenhum-boleto">
                    Você não tem nenhum boleto para pagar no momento
                </div>

                <h2 className="subtitulo">Pagamentos anteriores</h2>

                <div className="lista-pagamentos">
                    {pagamentos.map((item, index) => (
                        <div key={index} className="item-pagamento">
                            <div className="info-pagamento">
                                <div className="icon-taxa">TAX</div>
                                <span>{item.nome}</span>
                                <span className="status">{item.status}</span>
                            </div>
                            <div className="check-icon">
                                <FaCheck size={24} />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="paginacao">
                    <button className="paginacao-btn"><FaArrowLeft /></button>
                    <button className="paginacao-btn"><FaArrowRight /></button>
                </div>
            </div>
        </div>
    );
}
