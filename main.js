document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('quickscanForm');
    const steps = document.querySelectorAll('.step');
    const progressBar = document.getElementById('progressBar');
    const stepIndicator = document.getElementById('stepIndicator');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const resultSection = document.getElementById('resultSection');

    let currentStep = 1;
    const totalSteps = 6;
    let formData = JSON.parse(localStorage.getItem('renovaluxe_form_v2')) || {};

    const updateUI = () => {
        // Update Progress
        const percent = ((currentStep - 1) / (totalSteps - 1)) * 100;
        progressBar.style.width = `${percent}%`;
        stepIndicator.innerText = `Stap ${currentStep} van ${totalSteps}`;

        // Update Steps Visibility
        steps.forEach(step => {
            const stepNum = parseInt(step.dataset.step);
            if (stepNum === currentStep) {
                step.classList.remove('hidden');
                step.classList.add('fade-in');
            } else {
                step.classList.add('hidden');
                step.classList.remove('fade-in');
            }
        });

        // Update Buttons
        prevBtn.classList.toggle('hidden', currentStep === 1);
        nextBtn.innerText = currentStep === totalSteps ? 'Berekening Voltooien' : 'Volgende Stap';

        window.scrollTo({ top: 0, behavior: 'smooth' });
        handleConditionalFields();
    };

    const handleConditionalFields = () => {
        const type = form.elements['projectType']?.value;
        const dakArea = document.getElementById('dakArea');
        const gevelArea = document.getElementById('gevelArea');
        const asbestArea = document.getElementById('asbestArea');

        if (dakArea) dakArea.classList.toggle('hidden', !['dak', 'beide'].includes(type));
        if (gevelArea) gevelArea.classList.toggle('hidden', !['gevel', 'beide'].includes(type));
        if (asbestArea) asbestArea.classList.toggle('hidden', type !== 'asbest');
    };

    const validateStep = () => {
        const currentStepEl = document.querySelector(`.step[data-step="${currentStep}"]`);
        const requiredFields = currentStepEl.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (field.type === 'radio') {
                const name = field.name;
                const checked = currentStepEl.querySelector(`input[name="${name}"]:checked`);
                if (!checked) isValid = false;
            } else if (field.type === 'checkbox') {
                if (!field.checked) isValid = false;
            } else if (!field.value.trim()) {
                isValid = false;
            }
        });

        if (!isValid) {
            alert('Vul alstublieft alle verplichte velden in om verder te gaan.');
        }
        return isValid;
    };

    const saveToLocal = () => {
        const data = new FormData(form);
        const entries = Object.fromEntries(data.entries());
        // Simple storage for v2 flow
        localStorage.setItem('renovaluxe_form_v2', JSON.stringify(entries));
    };

    // Event Listeners for Nav
    nextBtn.addEventListener('click', () => {
        if (validateStep()) {
            if (currentStep < totalSteps) {
                currentStep++;
                saveToLocal();
                updateUI();
            } else {
                saveToLocal();
                submitProcess();
            }
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            updateUI();
        }
    });

    // Update range values
    form.addEventListener('input', (e) => {
        if (e.target.type === 'range') {
            const valSpan = document.getElementById(e.target.name.replace('Oppervlakte', 'Val'));
            if (valSpan) valSpan.innerText = e.target.value;
        }
    });

    // Option card styling & Auto-proceed
    form.addEventListener('change', (e) => {
        if (e.target.type === 'radio') {
            const radios = form.querySelectorAll(`input[name="${e.target.name}"]`);
            radios.forEach(r => r.closest('.option-card')?.classList.remove('active'));
            e.target.closest('.option-card')?.classList.add('active');

            // Auto-proceed for Step 1 and 2
            if (['projectType', 'typePand'].includes(e.target.name)) {
                setTimeout(() => {
                    if (validateStep()) {
                        nextBtn.click();
                    }
                }, 400);
            }
        }
        handleConditionalFields();
        saveToLocal();
    });

    const calculatePrice = (data) => {
        let min = 0; let max = 0;
        const type = data.projectType;

        if (['dak', 'beide'].includes(type)) {
            const area = parseInt(data.dakOppervlakte || 0);
            min += area * 50; max += area * 70;
        }
        if (['gevel', 'beide'].includes(type)) {
            const area = parseInt(data.gevelOppervlakte || 0);
            min += area * 60; max += area * 80;
        }
        if (type === 'asbest') {
            const area = parseInt(data.asbestOppervlakte || 0);
            min += area * 30; max += area * 45;
        }

        if (data.bouwjaar === 'voor_1970') { min *= 1.15; max *= 1.15; }
        if (data.asbestAanwezig === 'ja') { min += 2000; max += 4000; }

        return {
            min: Math.round(min / 100) * 100,
            max: Math.round(max / 100) * 100
        };
    };

    const submitProcess = () => {
        nextBtn.innerHTML = 'Berekenen...';
        nextBtn.disabled = true;

        setTimeout(() => {
            const finalData = JSON.parse(localStorage.getItem('renovaluxe_form_v2'));
            const { min, max } = calculatePrice(finalData);
            const formatter = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

            document.getElementById('formArea').innerHTML = `
                <div class="result-card fade-in">
                    <h2 style="color: var(--primary); margin-bottom: 10px;">Bedankt voor uw aanvraag!</h2>
                    <p style="margin-bottom: 20px;">Op basis van uw gegevens is dit de geschatte investering:</p>
                    <div class="price-range">${formatter.format(min)} - ${formatter.format(max)}</div>
                    <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 30px;">(Prijzen zijn exclusief BTW)</p>
                    
                    <div style="text-align: left; padding: 20px; background: #f9f9f9; border-radius: 4px; border-left: 4px solid var(--primary);">
                        <p style="font-weight: 600; margin-bottom: 8px;">Wat kunt u nu verwachten?</p>
                        <ul style="padding-left: 20px; font-size: 15px;">
                            <li style="margin-bottom: 6px;">U ontvangt een bevestiging op <strong>${finalData.email}</strong>.</li>
                            <li style="margin-bottom: 6px;">Een specialist van Renovaluxe neemt binnen 24 uur contact op.</li>
                            <li>We plannen een gratis inspectie in voor een definitieve offerte.</li>
                        </ul>
                    </div>

                    <div style="margin-top: 40px; display: flex; gap: 10px; justify-content: center;">
                        <a href="tel:0318274146" class="btn btn-primary" style="text-decoration: none;">Bel ons direct</a>
                        <button onclick="window.location.reload()" class="btn btn-secondary">Nieuwe aanvraag</button>
                    </div>
                </div>
            `;
        }, 1500);
    };

    // Start UI
    updateUI();
});
