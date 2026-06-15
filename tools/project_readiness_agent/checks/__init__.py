from __future__ import annotations

from . import architecture
from . import chat_goal_context
from . import ci_cd
from . import code_quality
from . import documentation
from . import product_readiness
from . import prompt_engineering
from . import security
from . import tests


CHECKS = [
    architecture,
    code_quality,
    security,
    tests,
    documentation,
    ci_cd,
    product_readiness,
    prompt_engineering,
    chat_goal_context,
]
