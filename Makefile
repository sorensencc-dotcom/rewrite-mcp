.PHONY: capture extract-metadata bench-rewrite bench-render bench-design clean help

help:
	@echo "Rewrite Labs Benchmark Pipeline"
	@echo ""
	@echo "Usage:"
	@echo "  make capture              - Fetch all 20 live SMB sites via Puppeteer"
	@echo "  make extract-metadata     - Auto-fill context.json from captured HTML"
	@echo "  make bench-rewrite        - Run Opus vs Sonnet A/B test"
	@echo "  make bench-render         - Compare Obscura vs Lightpanda rendering"
	@echo "  make bench-design         - Run screenshot-to-code ingestion harness"
	@echo "  make all                  - Run capture → extract → bench-rewrite"
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

clean:
	@echo "[benchmark] Cleaning benchmarks/out/"
	@rm -rf benchmarks/out/

all: capture extract-metadata bench-rewrite
	@echo "[benchmark] Pipeline complete"
