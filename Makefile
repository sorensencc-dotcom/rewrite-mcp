.PHONY: capture extract-metadata bench-rewrite bench-render bench-design bench-all test-all clean help

help:
	@echo "Rewrite Labs Benchmark & Test Pipeline"
	@echo ""
	@echo "Benchmarks:"
	@echo "  make capture              - Fetch all 20 live SMB sites via Puppeteer"
	@echo "  make extract-metadata     - Auto-fill context.json from captured HTML"
	@echo "  make bench-rewrite        - Run Opus vs Sonnet A/B test"
	@echo "  make bench-render         - Compare Obscura vs Lightpanda rendering"
	@echo "  make bench-design         - Run screenshot-to-code ingestion harness"
	@echo ""
	@echo "Tests:"
	@echo "  make test-all             - Run all regression tests"
	@echo "  make test-rewrite         - Run rewrite snapshot tests"
	@echo "  make test-render          - Run rendering snapshot tests"
	@echo "  make test-stc             - Run screenshot-to-code tests"
	@echo "  make test-metadata        - Run metadata extraction tests"
	@echo ""
	@echo "Workflows:"
	@echo "  make bench-all            - Full benchmark pipeline (capture → extract → bench-rewrite)"
	@echo "  make ci                   - CI workflow (metadata → tests)"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean                - Remove benchmarks/out/"
	@echo ""

capture:
	@echo "[benchmark] Capturing HTML snapshots..."
	@node benchmarks/capture/capture.js

extract-metadata:
	@echo "[benchmark] Extracting metadata from HTML..."
	@npx ts-node benchmarks/tools/extractMetadata.ts

bench-rewrite:
	@echo "[benchmark] Running Opus vs Sonnet A/B test..."
	@npx ts-node benchmarks/tools/opusSonnetBenchmark.ts

bench-render:
	@echo "[benchmark] Benchmarking renderers (Obscura vs Lightpanda)..."
	@npx ts-node benchmarks/tools/renderBenchmark.ts

bench-design:
	@echo "[benchmark] Running screenshot-to-code ingestion harness..."
	@npx ts-node benchmarks/tools/screenshotToCodeHarness.ts

test-rewrite:
	@echo "[test] Running rewrite snapshot tests..."
	@npx ts-node tests/rewrite/runRewriteTests.ts

test-render:
	@echo "[test] Running rendering snapshot tests..."
	@npx ts-node tests/render/runRenderTests.ts

test-stc:
	@echo "[test] Running screenshot-to-code tests..."
	@npx ts-node tests/stc/runStcTests.ts

test-metadata:
	@echo "[test] Running metadata extraction tests..."
	@npx ts-node tests/metadata/runMetadataTests.ts

test-all:
	@echo "[test] Running all regression tests..."
	@npx ts-node tests/runAll.ts

ci:
	@echo "[ci] Running CI workflow (metadata + tests)..."
	@npm run ci

status:
	@echo "[benchmark] Generating dashboard status..."
	@npm run bench:status

clean:
	@echo "[benchmark] Cleaning benchmarks/out/"
	@rm -rf benchmarks/out/

all: capture extract-metadata bench-rewrite
	@echo "[benchmark] Pipeline complete"
