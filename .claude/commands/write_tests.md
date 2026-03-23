Write comprehensive tests for: $ARGUMENTS

Testing conventions:
- Use Vitests with React Testing Library
- Pace test files in a __test__ directory in the same folder as the source file
- Name test files as [filename].test.ts(x)
- use @/ prefix for imports

Coverage:
- Test happy paths
- Test edge cases
- Test error states
- Focus on testing behavior and public API's rather tha implementation details.