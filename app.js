document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const { FIELDS, inputFields, inputEvent, parseField } = BearSettings;
  let resetting = false;
  const feedback = BearFeedback.create();
  const { copyText, copyFeedback } = feedback;
  const heroes = BearHeroController.create();
  const capacity = BearCapacityController.create({ onChange: update });
  const preferences = BearSettingsController.create({
    capacity,
    animateFeedback: feedback.animateFeedback,
  });
  const { scheduleSave } = preferences;
  const formation = BearFormationView.create({ heroes, capacity, feedback });

  $('copyFormation').addEventListener('click', async () => {
    flushUpdate();
    if (!formation.result) return;
    try {
      await copyText(formation.formationText());
      copyFeedback($('copyFormation'), 'Formation copied', true);
    } catch (e) {
      copyFeedback($('copyFormation'), 'Copy failed', false);
    }
  });

  $('copySetup').addEventListener('click', async () => {
    flushUpdate();
    if ($('copySetup').disabled) return;
    try {
      await copyText(preferences.setupUrl());
      copyFeedback($('copySetup'), 'Link copied', true);
    } catch (e) {
      copyFeedback($('copySetup'), 'Copy failed', false);
    }
  });

  const checkInputIds = new Set(
    FIELDS.filter((field) => field.scope === 'check').map((field) => field.id),
  );
  let updateFrame = null;
  let needsCalculation = false;
  function flushUpdate() {
    if (updateFrame === null) return;
    cancelAnimationFrame(updateFrame);
    updateFrame = null;
    const fullUpdate = needsCalculation;
    needsCalculation = false;
    if (fullUpdate) formation.calculate();
    else formation.check();
  }

  function update(event) {
    if (resetting) return;
    // A formation change takes precedence over checker edits in the same frame.
    if (!checkInputIds.has(event?.target?.id)) needsCalculation = true;
    if (updateFrame === null) updateFrame = requestAnimationFrame(flushUpdate);
    scheduleSave();
  }

  inputFields.forEach((field) => $(field.id).addEventListener(inputEvent(field), update));
  document.querySelectorAll('[data-ratio-adjust]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = $(button.dataset.ratioAdjust);
      const parsed = parseField(input.id, input.value);
      if (!parsed.valid) {
        update();
        return;
      }
      const current = parsed.value;
      const step = Number(button.dataset.ratioStep) || 0;
      input.value = String(Math.max(0, current + step));
      update();
    });
  });
  FIELDS.filter((field) => field.kind === 'radio').forEach((field) => {
    document
      .querySelectorAll(`input[name="${field.id}"]`)
      .forEach((el) => el.addEventListener(inputEvent(field), update));
  });

  $('the').addEventListener('click', () => {
    $('ri').value = 10;
    $('rc').value = 10;
    $('ra').value = 80;
    update();
  });

  $('reset').addEventListener('click', () => {
    resetting = true;
    cancelAnimationFrame(updateFrame);
    updateFrame = null;
    needsCalculation = false;
    preferences.clear();
    const url = new URL(window.location.href);
    const hasSharedSetup = url.searchParams.get('setup') === '1';
    if (hasSharedSetup) location.replace(BearSettings.resetUrl(url.href));
    else location.reload();
  });

  const sharedSetupLoaded = preferences.load();
  $('sharedNotice').hidden = !sharedSetupLoaded;
  const initialCalculationValid = formation.calculate();
  if (sharedSetupLoaded && initialCalculationValid) preferences.save();
});
