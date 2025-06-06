# Development Workflow

## Version Control Strategy

### Branch Structure
- `main` - Production-ready code
- `feature/*` - New features and improvements
- `hotfix/*` - Urgent fixes for production issues
- `release/*` - Release preparation branches

### Working with Branches

1. **Starting New Work**
   ```bash
   git checkout main
   git pull
   git checkout -b feature/your-feature-name
   ```

2. **Committing Changes**
   ```bash
   git add .
   git commit -m "type: descriptive message"
   ```
   Commit types:
   - `feat:` New features
   - `fix:` Bug fixes
   - `docs:` Documentation changes
   - `style:` Code style changes
   - `refactor:` Code refactoring
   - `test:` Adding tests
   - `chore:` Maintenance tasks

3. **Quick Rollback**
   ```bash
   # If something breaks
   git reset --hard HEAD~1  # Undo last commit
   # OR
   git checkout main        # Return to last known good state
   ```

### Working Build Management

1. **Tagging Working Builds**
   ```bash
   git tag -a v0.1.0-working -m "Working build with core systems"
   git push origin v0.1.0-working
   ```

2. **Restoring Working Build**
   ```bash
   git checkout v0.1.0-working
   # OR
   git checkout <commit-hash>
   ```

3. **Emergency Rollback**
   ```bash
   # If production build breaks
   git checkout main
   git reset --hard v0.1.0-working
   git push -f origin main
   ```

## Development Guidelines

1. **Before Starting Work**
   - Pull latest changes
   - Create feature branch
   - Test existing functionality

2. **During Development**
   - Commit frequently
   - Write descriptive commit messages
   - Test changes locally

3. **Before Committing**
   - Run tests
   - Check for linting errors
   - Verify build process

4. **Emergency Procedures**
   - Document the issue
   - Tag the last working build
   - Create hotfix branch
   - Test fix thoroughly
   - Merge to main

## Build Process

1. **Development Build**
   ```bash
   npm run dev
   ```

2. **Production Build**
   ```bash
   npm run build
   ```

3. **Testing Build**
   ```bash
   npm run test
   ```

## Common Issues and Solutions

1. **Port Already in Use**
   ```bash
   # Find process using port
   lsof -i :9002
   # Kill process
   kill -9 <PID>
   ```

2. **Dependency Issues**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules
   npm install
   ```

3. **Build Failures**
   ```bash
   # Clear build cache
   npm run clean
   # Rebuild
   npm run build
   ```

## Best Practices

1. **Code Organization**
   - Keep related files together
   - Use consistent naming conventions
   - Document complex logic

2. **Testing**
   - Write unit tests for new features
   - Test edge cases
   - Verify performance impact

3. **Documentation**
   - Update docs with new features
   - Document breaking changes
   - Keep README current

4. **Performance**
   - Monitor build times
   - Check bundle sizes
   - Profile critical paths 