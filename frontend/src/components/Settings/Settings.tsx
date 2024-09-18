import {
  Button,
  Flex,
  Heading,
  SelectField,
  Text,
  useTheme,
} from '@aws-amplify/ui-react';
import type React from 'react';
import { useEffect, useState } from 'react';

import cache from '../../helpers/cache';

type SettingsProps = {
  children?: React.ReactNode;
};

const Settings: React.FC<SettingsProps> = () => {
  const { tokens } = useTheme();
  const [isLoading, setLoading] = useState(false);
  const [settings, setSettings] = useState<{
    videos?: string;
    images?: string;
  }>({});

  useEffect(() => {
    const getDefaultValues = async (): Promise<void> => {
      const imagesSettings = await cache.getItem('images-settings');
      const videosSettings = await cache.getItem('videos-settings');

      setSettings({
        videos: videosSettings,
        images: imagesSettings,
      });
    };

    getDefaultValues();
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();

    setLoading(true);
    const videos = e.currentTarget.videos.value;
    const images = e.currentTarget.images.value;
    cache.setItem('videos-settings', videos);
    cache.setItem('images-settings', images);
    setTimeout(() => {
      setLoading(false);
    }, 350);
  };

  return (
    <Flex
      paddingTop={'10px'}
      width={'80vw'}
      height={'100%'}
      direction={'column'}
    >
      <Heading
        level={1}
        color={tokens.colors.font.primary}
        fontWeight={tokens.fontWeights.normal}
      >
        Settings
      </Heading>
      <Text
        color={tokens.colors.font.primary}
        fontSize={tokens.fontSizes.large}
        fontWeight={tokens.fontWeights.light}
      >
        Transform settings, changes will apply to all future uploads.
      </Text>
      <form
        onSubmit={handleSubmit}
        style={{
          width: '40%',
        }}
      >
        <SelectField
          label="Images"
          descriptiveText="Choose a size for the images"
          name="images"
          defaultValue={settings.images}
        >
          <option value="sd">720×480 px</option>
          <option value="hd">1280×720 px</option>
          <option value="hdtv">1920×1080 px</option>
        </SelectField>
        <SelectField
          marginTop={tokens.space.small}
          label="Videos"
          descriptiveText="Choose a resolution for the videos"
          name="videos"
          defaultValue={settings.videos}
        >
          <option value="480p">SD (480p)</option>
          <option value="720p">HD (720p)</option>
          <option value="1080p">Full HD (1080p)</option>
        </SelectField>
        <Button
          marginTop={tokens.space.small}
          type="submit"
          variation="primary"
          loadingText="Saving"
          isLoading={isLoading}
        >
          Save
        </Button>
      </form>
    </Flex>
  );
};

export default Settings;
