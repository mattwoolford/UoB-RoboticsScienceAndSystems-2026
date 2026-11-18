"""Text menus shared by notebook input prompts and Python terminals."""
from simulation_runner import select_candidates


def _choose(title, options):
    print(f'\n{title}')
    for number, (label, _) in enumerate(options, start=1):
        print(f'  {number}. {label}')
    print('  0. Cancel')
    while True:
        try:
            answer = input(f'Choose an option [1–{len(options)}]: ').strip().lower()
        except EOFError as error:
            raise RuntimeError('No interactive input available. Set INTERACTIVE_SELECTION = False '
                               'in the notebook menu cell for unattended execution.') from error
        if answer in {'0', 'q', 'quit'}:
            raise KeyboardInterrupt('Selection cancelled; no simulations started.')
        if answer in {str(number) for number in range(1, len(options) + 1)}:
            return options[int(answer) - 1][1]
        print(f'Enter a number from 1 to {len(options)}, or 0 to cancel.')


def prompt_run_selection(candidates, labels=None):
    """Return (mode, candidate ID); all modes return None for the candidate ID."""
    models = select_candidates(candidates)  # Validate IDs before presenting choices.
    labels = labels or {}
    mode = _choose('Simulation run menu', [
        ('Run one candidate', 'single'),
        ('Run all candidates sequentially', 'all_sequential'),
        ('Run all candidates in parallel', 'all_parallel'),
    ])
    selected = None
    if mode == 'single':
        selected = _choose('Select a candidate', [
            (f"{labels.get(model['model_id'], model['model_id'])} [{model['model_id']}]",
             model['model_id']) for model in models
        ])
    return mode, selected
