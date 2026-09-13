import React from 'react';
import { VisitorUser } from '../types';
import { TreasureHuntPage } from './TreasureHuntPage';

interface Page3MemoryUnlockedProps {
  user: VisitorUser;
  onReturnToPuzzle: () => void;
  onReturnToEntrance?: () => void;
  onProceedToNextChapter?: () => void;
}

export const Page3MemoryUnlocked: React.FC<Page3MemoryUnlockedProps> = ({
  user,
  onReturnToPuzzle,
  onProceedToNextChapter = () => {},
}) => {
  return (
    <TreasureHuntPage
      user={user}
      onReturnToPuzzle={onReturnToPuzzle}
      onProceedToPage4={onProceedToNextChapter}
    />
  );
};


