'use client'
import { useRef } from 'react'
import { Printer, X, ShoppingCart } from 'lucide-react'
import { Sale, Settings } from '@/lib/db'

interface Props {
  sale: Sale & { settings?: Settings }
  settings: Settings
  onClose: () => void
}

const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtInt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

export default function ReceiptModal({ sale, settings, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const content = printRef.current?.innerHTML
    if (!content) return
    const win = window.open('', '_blank', 'width=400,height=600')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>ใบเสร็จ #${sale.receiptNo}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', 'TH Sarabun New', monospace;
            font-size: 12px;
            width: 80mm;
            padding: 4mm;
            color: #000;
          }
          .center { text-align: center; }
          .right { text-align: right; }
          .bold { font-weight: bold; }
          .big { font-size: 16px; }
          .divider { border-top: 1px dashed #000; margin: 4px 0; }
          .row { display: flex; justify-content: space-between; margin: 2px 0; }
          .item-name { flex: 1; }
          .item-qty { width: 30px; text-align: center; }
          .item-price { width: 60px; text-align: right; }
          .item-total { width: 70px; text-align: right; }
          .total-row { font-size: 14px; font-weight: bold; }
        </style>
      </head>
      <body>
        ${content}
        <script>
          window.onload = () => {
            window.onafterprint = () => window.close();
            setTimeout(() => window.print(), 300);
          };
        <\/script>
      </body>
      </html>
    `)
    win.document.close()
  }

  const paymentLabels: Record<string, string> = {
    cash: 'เงินสด', qr: 'QR/โอน', card: 'บัตรเครดิต/เดบิต', other: 'อื่นๆ'
  }

  const dateStr = new Date(sale.createdAt).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-600">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              ✓
            </div>
            <div>
              <p className="font-bold text-gray-800">ชำระเงินสำเร็จ!</p>
              <p className="text-xs text-gray-400">#{sale.receiptNo}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Receipt Preview */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Printable Receipt */}
          <div
            ref={printRef}
            className="bg-gray-50 rounded-xl p-4 font-mono text-xs leading-relaxed border border-gray-200"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            {/* Shop Header */}
            <div className="center mb-2">
              <div className="bold big">{settings.shopName}</div>
              {settings.shopAddress && <div>{settings.shopAddress}</div>}
              {settings.shopPhone && <div>โทร: {settings.shopPhone}</div>}
              {settings.shopTaxId && <div>เลขที่ผู้เสียภาษี: {settings.shopTaxId}</div>}
              {settings.receiptHeader && (
                <div className="mt-1">{settings.receiptHeader}</div>
              )}
            </div>

            <div className="divider" style={{ borderTop: '1px dashed #999', margin: '6px 0' }}></div>

            {/* Receipt Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span>ใบเสร็จ:</span>
              <span className="bold">#{sale.receiptNo}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span>วันที่:</span>
              <span>{dateStr}</span>
            </div>
            {sale.memberName && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span>สมาชิก:</span>
                <span>{sale.memberName}</span>
              </div>
            )}

            <div className="divider" style={{ borderTop: '1px dashed #999', margin: '6px 0' }}></div>

            {/* Column Headers */}
            <div className="row" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: 4 }}>
              <span style={{ flex: 1 }}>รายการ</span>
              <span style={{ width: 30, textAlign: 'center' }}>จำนวน</span>
              <span style={{ width: 60, textAlign: 'right' }}>ราคา</span>
              <span style={{ width: 70, textAlign: 'right' }}>รวม</span>
            </div>

            {/* Items */}
            {sale.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ flex: 1 }} className="item-name">{item.productName}</span>
                <span style={{ width: 30, textAlign: 'center' }}>{item.qty}</span>
                <span style={{ width: 60, textAlign: 'right' }}>{fmt(item.price)}</span>
                <span style={{ width: 70, textAlign: 'right' }}>{fmt(item.total)}</span>
              </div>
            ))}

            <div className="divider" style={{ borderTop: '1px dashed #999', margin: '6px 0' }}></div>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span>ราคารวม</span>
              <span>฿{fmt(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span>ส่วนลด{sale.discountNote ? ` (${sale.discountNote})` : ''}</span>
                <span>-฿{fmt(sale.discount)}</span>
              </div>
            )}
            {settings.taxRate > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span>ภาษี ({settings.taxRate}%)</span>
                <span>฿{fmt(sale.total * settings.taxRate / 100)}</span>
              </div>
            )}

            <div className="divider" style={{ borderTop: '2px solid #000', margin: '6px 0' }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 14, marginBottom: 4 }}>
              <span>ยอดสุทธิ</span>
              <span>฿{fmt(sale.total)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span>ชำระด้วย</span>
              <span>{paymentLabels[sale.paymentMethod] || sale.paymentMethod}</span>
            </div>
            {sale.paymentMethod === 'cash' && sale.cashReceived !== undefined && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span>รับเงิน</span>
                  <span>฿{fmt(sale.cashReceived)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span>เงินทอน</span>
                  <span>฿{fmt(sale.change || 0)}</span>
                </div>
              </>
            )}

            {sale.pointsEarned > 0 && (
              <>
                <div className="divider" style={{ borderTop: '1px dashed #999', margin: '6px 0' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>แต้มที่ได้รับ</span>
                  <span className="bold">+{fmtInt(sale.pointsEarned)} แต้ม</span>
                </div>
              </>
            )}

            <div className="divider" style={{ borderTop: '1px dashed #999', margin: '6px 0' }}></div>

            {/* Footer */}
            <div className="center" style={{ textAlign: 'center', marginTop: 4 }}>
              {settings.receiptFooter && <div>{settings.receiptFooter}</div>}
              <div style={{ marginTop: 4, fontSize: 10, color: '#666' }}>Powered by Happy POS</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 pt-3 flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            <Printer size={18} />
            พิมพ์ใบเสร็จ
          </button>
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            <ShoppingCart size={18} />
            ออเดอร์ใหม่
          </button>
        </div>
      </div>
    </div>
  )
}
