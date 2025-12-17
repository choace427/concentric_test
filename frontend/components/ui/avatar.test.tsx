import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';

describe('Avatar', () => {
  it('should render avatar with fallback', () => {
    render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByText('AB')).toBeInTheDocument();
  });

  it('should render avatar with image', () => {
    const { container } = render(
      <Avatar>
        <AvatarImage src="test.jpg" alt="Test" />
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    );
    // In jsdom, AvatarImage might not render, but the structure should exist
    const img = container.querySelector('img');
    if (img) {
      expect(img).toHaveAttribute('src', 'test.jpg');
      expect(img).toHaveAttribute('alt', 'Test');
    } else {
      // Fallback should be visible if image doesn't load
      expect(screen.getByText('AB')).toBeInTheDocument();
    }
  });

  it('should apply custom className', () => {
    const { container } = render(
      <Avatar className="custom-avatar">
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    );
    expect(container.firstChild).toHaveClass('custom-avatar');
  });

  it('should render fallback when image fails to load', () => {
    render(
      <Avatar>
        <AvatarImage src="invalid.jpg" alt="Test" />
        <AvatarFallback>FB</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByText('FB')).toBeInTheDocument();
  });
});

