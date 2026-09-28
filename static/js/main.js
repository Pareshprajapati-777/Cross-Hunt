// Main JavaScript for Cross Booking Management System

document.addEventListener('DOMContentLoaded', function () {
    // 1. Live Price Estimator for Booking Form
    const startTimeInput = document.getElementById('id_start_time');
    const endTimeInput = document.getElementById('id_end_time');
    const basePriceElem = document.getElementById('cross-base-price');
    const estimatedHoursElem = document.getElementById('calc-estimated-hours');
    const estimatedTotalElem = document.getElementById('calc-estimated-total');

    function calculateEstimate() {
        if (!startTimeInput || !endTimeInput || !basePriceElem || !estimatedTotalElem) return;

        const startVal = startTimeInput.value;
        const endVal = endTimeInput.value;
        const basePrice = parseFloat(basePriceElem.dataset.price || '0');

        if (startVal && endVal && basePrice > 0) {
            const [startH, startM] = startVal.split(':').map(Number);
            const [endH, endM] = endVal.split(':').map(Number);

            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;

            if (endMinutes > startMinutes) {
                const diffHours = (endMinutes - startMinutes) / 60.0;
                const roundedHours = Math.round(diffHours * 100) / 100;
                const total = Math.round(roundedHours * basePrice * 100) / 100;

                if (estimatedHoursElem) {
                    estimatedHoursElem.textContent = roundedHours.toFixed(2) + ' hrs';
                }
                estimatedTotalElem.textContent = '$' + total.toFixed(2);
                return;
            }
        }

        if (estimatedHoursElem) estimatedHoursElem.textContent = '--';
        if (estimatedTotalElem) estimatedTotalElem.textContent = '$0.00';
    }

    if (startTimeInput && endTimeInput) {
        startTimeInput.addEventListener('change', calculateEstimate);
        endTimeInput.addEventListener('change', calculateEstimate);
        calculateEstimate();
    }

    // 2. Global image fallback handler
    document.querySelectorAll('img').forEach(function (img) {
        img.addEventListener('error', function () {
            if (!this.dataset.triedFallback) {
                this.dataset.triedFallback = 'true';
                this.src = '/static/images/placeholder.png';
            }
        });
    });

    // 3. Auto dismiss alert messages after 6 seconds
    setTimeout(function () {
        const alerts = document.querySelectorAll('.alert-dismissible');
        alerts.forEach(function (alert) {
            const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
            if (bsAlert) bsAlert.close();
        });
    }, 6000);
});
