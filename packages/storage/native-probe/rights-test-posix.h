/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Storage Rights Verification
 * 📄 File: packages/storage/native-probe/rights-test-posix.h
 * 🎯 Purpose: Declares owner-local synthetic fixture and decoder test operations.
 * 🧠 Responsibilities: Keeps test inputs outside runtime capability contracts.
 * 🏗️ Architecture: Test-only declarations.
 * ⚠️ Important: Fixture helpers operate only on explicitly supplied test directories.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
#pragma once
void PosixDecoderControls();
void PreparePosixRightsFixture(const char* path, const char* control, const char* identity);
