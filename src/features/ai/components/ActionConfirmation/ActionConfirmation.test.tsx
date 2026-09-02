import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ActionConfirmation from './ActionConfirmation';
import type { AIAction } from '../../actions/actionTypes';
describe('mutation preview clarity',()=>{
  it('shows requested changes alongside the current record title',()=>{
    const action:AIAction={type:'confirmAgentAction',payload:{actionId:'test',tool:'update_task',preview:{title:'Old task',changes:{title:'New task',description:'Updated details'}}},label:'Task',confirmationMessage:'Confirm?',success:'Done',error:'Failed'};
    render(<ActionConfirmation action={action} status="pending" onConfirm={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText(/Old task/)).toHaveTextContent('New task');
    expect(screen.getByText(/Old task/)).toHaveTextContent('Updated details');
    expect(screen.getByRole('button',{name:'Tasdiqlash'})).toBeEnabled();
  });
});
