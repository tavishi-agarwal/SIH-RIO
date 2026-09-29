"""Abstract base class for all hydraulic model adapters."""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional


@dataclass
class ModelRunResult:
    """Result of a model execution."""
    success: bool
    model_name: str
    model_version: str
    execution_time_s: float
    output_files: List[str]
    metadata: Dict[str, Any]
    errors: List[str]
    is_mock: bool
    output_dir: str = ""
    flood_stats: Dict[str, Any] = field(default_factory=dict)


class ModelAdapter(ABC):
    """
    Abstract base class for all hydraulic model adapters.

    Each adapter implements the full pipeline from input validation
    through output parsing. Concrete adapters implement the actual model
    execution (or a mock deterministic substitute).
    """

    MODEL_NAME: str = "UNKNOWN"
    MODEL_VERSION: str = "unknown"
    IS_MOCK: bool = True

    @abstractmethod
    def validate_input(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate model inputs.
        Returns dict with: valid (bool), errors (list), warnings (list).
        """
        ...

    @abstractmethod
    def prepare_input(self, config: Dict[str, Any], output_dir: str) -> Dict[str, Any]:
        """
        Prepare model input files in output_dir.
        Returns dict describing prepared files.
        """
        ...

    @abstractmethod
    def generate_config(self, scenario: Dict[str, Any], prepared_input: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate model-specific configuration from scenario definition.
        Returns model configuration dict.
        """
        ...

    @abstractmethod
    def run(self, config: Dict[str, Any], model_config: Dict[str, Any]) -> ModelRunResult:
        """
        Execute the model (real or mock).
        Returns ModelRunResult with paths to output files.
        """
        ...

    @abstractmethod
    def parse_output(self, output_dir: str, run_result: ModelRunResult) -> Dict[str, Any]:
        """
        Parse model output files into normalized result dict.
        Returns flood statistics and file paths.
        """
        ...

    @abstractmethod
    def cleanup(self, output_dir: str) -> None:
        """Remove temporary files if needed."""
        ...

    def get_status(self) -> Dict[str, Any]:
        """Return current adapter status."""
        return {
            "model_name": self.MODEL_NAME,
            "model_version": self.MODEL_VERSION,
            "adapter_status": "READY",
            "execution_mode": "MOCK" if self.IS_MOCK else "REAL",
            "real_solver_connected": not self.IS_MOCK,
            "is_mock": self.IS_MOCK,
            "disclaimer": (
                f"MOCK {self.MODEL_NAME} — DEMONSTRATION ONLY. "
                "Not a validated operational solver."
            ) if self.IS_MOCK else None,
        }
