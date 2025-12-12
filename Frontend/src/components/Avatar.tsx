interface AvatarProps {
  name?: string;
  email?: string;
  user?: {
    name?: string;
    username?: string;
    email?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

export const Avatar = ({ name, email, user, size = 'md', className = '' }: AvatarProps) => {
  // user 객체가 있으면 우선 사용
  const displayName = user?.name || user?.username || name || '';
  const displayEmail = user?.email || email || '';

  // 이름의 첫 글자 또는 이메일의 첫 글자를 사용
  const getInitials = () => {
    if (displayName) {
      const parts = displayName.trim().split(' ');
      if (parts.length > 1) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return displayName[0].toUpperCase();
    }
    if (displayEmail) {
      return displayEmail[0].toUpperCase();
    }
    return '?';
  };

  // 색상 생성 (이름 기반)
  const getColor = () => {
    const colors = [
      'bg-indigo-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-red-500',
      'bg-orange-500',
      'bg-yellow-500',
      'bg-green-500',
      'bg-teal-500',
      'bg-blue-500',
      'bg-cyan-500',
    ];
    const colorSource = displayName || displayEmail || '?';
    const index = colorSource.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div
      className={`${sizeClasses[size]} ${getColor()} rounded-full flex items-center justify-center text-white font-medium ${className}`}
      title={displayName || displayEmail}
    >
      {getInitials()}
    </div>
  );
};

