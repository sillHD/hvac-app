import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canCreateUserRole, canManageTargetUser } from './authorization';

describe('authorization user management rules', () => {
  it('allows root to create technician/admin but not root', () => {
    assert.equal(canCreateUserRole('root', 'technician'), true);
    assert.equal(canCreateUserRole('root', 'admin'), true);
    assert.equal(canCreateUserRole('root', 'root'), false);
  });

  it('allows admin to create only technicians', () => {
    assert.equal(canCreateUserRole('admin', 'technician'), true);
    assert.equal(canCreateUserRole('admin', 'admin'), false);
    assert.equal(canCreateUserRole('admin', 'root'), false);
  });

  it('allows admin to manage only technician targets', () => {
    assert.equal(canManageTargetUser('admin', 'technician'), true);
    assert.equal(canManageTargetUser('admin', 'admin'), false);
    assert.equal(canManageTargetUser('admin', 'root'), false);
  });

  it('blocks technician from managing users', () => {
    assert.equal(canManageTargetUser('technician', 'technician'), false);
    assert.equal(canCreateUserRole('technician', 'technician'), false);
  });
});
