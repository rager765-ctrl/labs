import React from 'react';
import { Printer, Download, X, FileText, CheckCircle2 } from 'lucide-react';
import { openFormattedPdfExtractor } from '../../services/exportService';

interface PdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  htmlContent: string;
  onDownloadCsv?: () => void;
}

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  htmlContent,
  onDownloadCsv,
}) => {
  if (!isOpen) return null;

  const handlePrintPdf = () => {
    openFormattedPdfExtractor(htmlContent);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-md, 12px)',
          width: '100%',
          maxWidth: '1050px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid var(--color-line, #E2E8F0)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-line, #E2E8F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                color: '#2563EB',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <FileText size={20} />
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                {title}
              </h2>
              {subtitle && (
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  {subtitle}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onDownloadCsv && (
              <button
                type="button"
                onClick={onDownloadCsv}
                className="btn-secondary"
                style={{
                  height: '36px',
                  padding: '0 12px',
                  fontSize: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
                title="Download CSV spreadsheet"
              >
                <Download size={14} />
                <span>Download CSV</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrintPdf}
              className="btn-primary"
              style={{
                height: '36px',
                padding: '0 14px',
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
              }}
            >
              <Printer size={15} />
              <span>Save as PDF / Print</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748B',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'grid',
                placeItems: 'center',
                marginLeft: '6px',
              }}
              title="Close Preview"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Informational Banner */}
        <div
          style={{
            padding: '8px 20px',
            backgroundColor: '#EFF6FF',
            borderBottom: '1px solid #BFDBFE',
            fontSize: '12px',
            color: '#1E40AF',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={15} color="#2563EB" />
          <span>
            Click <strong>Save as PDF / Print</strong> to export an official high-resolution PDF document directly to your device.
          </span>
        </div>

        {/* Live Document Preview Frame */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            backgroundColor: '#E2E8F0',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '900px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              borderRadius: '4px',
              overflow: 'hidden',
              minHeight: '600px',
            }}
          >
            <iframe
              srcDoc={htmlContent}
              title="PDF Report Preview"
              style={{
                width: '100%',
                height: '650px',
                border: 'none',
                display: 'block',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
