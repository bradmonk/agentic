---
applyTo: '**'
---

# AI Instructions
- Always remember to activate the python virtual environment if one is present in the project.
- Never use the `python3` command, because that is system python and we want to use the virtual environment python.
- Always use `python` to run python scripts, never `python3`.
- Never cd into other directories unless absolutely necessary. Run all commands from the root of the project.
- Remember to kill any running processes before starting new ones to avoid port conflicts.
- Always use the provided restart script `./restart.sh` to start or restart the application during development.
- After running the restart script, wait for the user to test the changes in the browser before making further modifications.
- Always confirm with the user that the changes work as expected before proceeding to the next task.
- Do not launch the built-in browser automatically. Wait for the user to open the browser manually.
- Be aware that you are suseptible to duplicating code that already exists in the project. Always check for existing code before adding new code.
- When making changes to the codebase, note your progress in a DEVELOPMENT.md file in the root of the project.
- Remember this computer has an arm64 architecture. Do not suggest install x86_64 packages.