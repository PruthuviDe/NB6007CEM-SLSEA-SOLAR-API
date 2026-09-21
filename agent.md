# Agent Guidelines & Operational Rules (`agent.md`)

> **Project:** NB6007CEM — SLSEA Real-Time Solar Generation Data REST API  
> **Student / Repository Owner:** W.P.N.S.M.D.SILVA (16602658 / COBSCCOMP25.1P-016)  
> **Workspace Root:** `c:\Users\User\Desktop\NB6007CEM-SLSEA-SOLAR-API`  
> **Rule Version:** 1.0.0 (Strict Human-in-the-Loop Mode)

---

## Mandatory Operational Directives

### 1. Explicit Permission Required Before Any File Creation or Edit 🛑
- The AI agent must **NEVER** edit, overwrite, modify, or create any file autonomously.
- Before making any code change, configuration edit, or file generation, the agent must:
  1. Clearly explain the proposed changes, exact file paths, and rationale.
  2. Show a summary or preview of what will be modified or added.
  3. **STOP and wait for the user's explicit permission** before executing any edit or write tool.

### 2. User Executes All Git Actions Manually 🛑
- The AI agent must **NEVER** run `git add`, `git commit`, `git push`, `git merge`, or `git checkout`.
- All Git operations are executed **manually by the student**.
- When a commit milestone is reached, the AI agent must:
  1. State the exact Git commands to run.
  2. State the exact files to be staged.
  3. Provide a clear Conventional Commit message.
  4. Record the commit details in `Documents/git_commit_log.md`.

### 3. No Skills Usage Without User Confirmation 🛑
- The AI agent must **NOT** invoke, trigger, or execute any specialized skills unless the user explicitly instructs and confirms the use of that skill.

### 4. Strict Workspace Boundaries 🛑
- All work must be strictly confined to `c:\Users\User\Desktop\NB6007CEM-SLSEA-SOLAR-API`.
- The agent must **NEVER** touch, read, modify, or run commands inside `WebAPIDEV_Test` or `WebAPI` folders unless explicitly commanded by the user.

### 5. Academic & Architectural Integrity 🏛️
- **Design Authority:** WSO2 REST API Design Guidelines (Richardson Maturity Model Level 2).
- **Target Host:** Microsoft Azure App Service (Linux, Node.js 20 LTS).
- **Custom Domain:** `https://api.slsea-solar.site` with Azure-Managed SSL.
- **Critical Domain Rules:**
  - Meter/Inverter ID is an attribute of `SolarInstallation` (never a separate `Device` entity).
  - `GenerationReading` is an append-only time series (never flattened to last-value fields).
  - Write-Read Split: Smart meters are write-only (`installation:write`); SLSEA users are read-only with jurisdiction scopes (`read:district`, `read:province`, `read:national`).

### 6. Mandatory AI Prompt Logging (Appendix A) 📝
- For every major architectural prompt, code generation task, or lecturer feedback remediation, the AI agent must record and refine the prompt in `Documents/ai_prompts_log.md`.
- Trivial conversational prompts (e.g. 'what mean UK', 'yes start') must be excluded.
- Each logged entry must include: Refined Prompt Text, Tool/Model, Target Artefact, and Student Critical Evaluation & Repair.

### 7. Mandatory Git Commit Logging 🌿
- For every Git commit executed with student confirmation, the AI agent must immediately update `Documents/git_commit_log.md` with:
  - Commit number, timestamp, branch, and short SHA hash.
  - Conventional commit message.
  - Staged files list.
  - Assessment rationale and rubric mapping (Dimension 6).

