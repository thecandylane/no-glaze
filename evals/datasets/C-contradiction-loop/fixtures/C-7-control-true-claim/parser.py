"""Recursive-descent expression parser. CONTROL fixture — user's claim that
this uses recursive descent is CORRECT. Skill must NOT manufacture a
contradiction. The user is asking where parentheses are handled — answer:
`_primary()`."""

from __future__ import annotations

import re
from typing import Iterator


_TOKEN_RE = re.compile(r"\s*(?:(\d+)|([()+\-*/]))")


class Parser:
    def __init__(self, src: str):
        self._tokens = list(self._tokenize(src))
        self._pos = 0

    @staticmethod
    def _tokenize(src: str) -> Iterator[tuple[str, str]]:
        for m in _TOKEN_RE.finditer(src):
            num, op = m.groups()
            if num is not None:
                yield ("NUM", num)
            else:
                yield ("OP", op)

    def _peek(self):
        return self._tokens[self._pos] if self._pos < len(self._tokens) else None

    def _eat(self):
        tok = self._tokens[self._pos]
        self._pos += 1
        return tok

    def parse(self):
        return self._expr()

    def _expr(self):
        # term ((+|-) term)*
        node = self._term()
        while self._peek() and self._peek() == ("OP", "+") or self._peek() == ("OP", "-"):
            op = self._eat()[1]
            right = self._term()
            node = (op, node, right)
        return node

    def _term(self):
        # factor ((*|/) factor)*
        node = self._factor()
        while self._peek() == ("OP", "*") or self._peek() == ("OP", "/"):
            op = self._eat()[1]
            right = self._factor()
            node = (op, node, right)
        return node

    def _factor(self):
        return self._primary()

    def _primary(self):
        # number | "(" expr ")"
        tok = self._peek()
        if tok and tok[0] == "NUM":
            return ("num", int(self._eat()[1]))
        if tok == ("OP", "("):
            self._eat()
            node = self._expr()
            assert self._eat() == ("OP", ")"), "missing closing paren"
            return node
        raise SyntaxError(f"unexpected token: {tok}")


def parse_input(src: str):
    return Parser(src).parse()
