package com.ottfinder.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "ott_platforms")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OttPlatform {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String name;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Column(name = "logo_url", length = 255)
    private String logoUrl;

    @Column(name = "base_url", length = 255)
    private String baseUrl;

    @Column(name = "affiliate_link_template", length = 500)
    private String affiliateLinkTemplate;

    @Column(name = "country_code", length = 5)
    private String countryCode;

    @Column(name = "justwatch_provider_id", unique = true)
    private Integer justwatchProviderId;
}
