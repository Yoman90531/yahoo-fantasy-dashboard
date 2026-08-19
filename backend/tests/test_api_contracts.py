import unittest

from fastapi.routing import APIRoute

from app.main import app


class ApiContractTest(unittest.TestCase):
    def test_public_data_routes_declare_response_models(self) -> None:
        missing = []
        for route in app.routes:
            if not isinstance(route, APIRoute):
                continue
            if not route.path.startswith("/api/") or route.path == "/api/health":
                continue
            if route.response_model is None:
                missing.append(f"{','.join(sorted(route.methods or []))} {route.path}")

        self.assertEqual(missing, [])

    def test_openapi_schema_can_be_generated(self) -> None:
        schema = app.openapi()
        self.assertIn("/api/stats/weekly-records", schema["paths"])
        self.assertIn("/api/keepers/board", schema["paths"])
        self.assertIn("WeeklyRecords", schema["components"]["schemas"])
        self.assertIn("KeeperBoard", schema["components"]["schemas"])
        self.assertNotIn("/api/sync/run", schema["paths"])


if __name__ == "__main__":
    unittest.main()
