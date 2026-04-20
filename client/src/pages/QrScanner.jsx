import React, { useEffect, useRef } from 'react'

export default function QrScanner({ onScan, onClose }) {
    const scannerRef = useRef(null)
    const html5QrCodeRef = useRef(null)

    useEffect(() => {
        let scanner
        import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
            scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 }, false)
            scanner.render(
                (text) => {
                    scanner.clear()
                    onScan(text)
                },
                (err) => { }
            )
            html5QrCodeRef.current = scanner
        })
        return () => {
            html5QrCodeRef.current?.clear().catch(() => { })
        }
    }, [onScan])

    return (
        <div>
            <div id="qr-reader" ref={scannerRef} style={{ width: '100%' }} />
            <button className="btn btn-secondary w-full mt-8" onClick={onClose}>Cancel</button>
        </div>
    )
}
