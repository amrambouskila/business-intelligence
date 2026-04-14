# Versions — Business Intelligence

## v0.1.0 — Architecture + Initial Charts

- Complete chart registry and renderer architecture (ECharts, deck.gl, regl, Canvas2D base classes)
- Data pipeline: file upload, CSV/JSON parsing, column analysis, shape detection, chart suggestion
- Zustand + Immer state management (dataset, chart, UI, filter, annotation stores)
- Dark/light theming with Tailwind CSS v4 + Radix UI primitives
- 3 chart types implemented: histogram, line, scatter
- Sidebar with chart picker (family browser + chart type list)
- Docker containerization with nginx serving
- Launcher scripts (`bi_service.sh`, `bi_service.bat`)